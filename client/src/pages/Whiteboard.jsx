import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import UsersPanel, { VideoTile } from '../components/UsersPanel';
import MeetingControls from '../components/MeetingControls';
import {
    MessageSquare, X, Share2, ChevronLeft, ChevronRight,
    Users, Pencil, Check, Mic, MicOff, Monitor
} from 'lucide-react';


const Whiteboard = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const dark = theme === 'dark';

    const [socket, setSocket] = useState(null);
    const [mySocketId, setMySocketId] = useState(null);
    const [users, setUsers] = useState([]);
    const [isHost, setIsHost] = useState(false);
    const [drawLocked, setDrawLocked] = useState(false);
    const [meetingMode, setMeetingMode] = useState(false);

    // Room name
    const [roomName, setRoomName] = useState(() => sessionStorage.getItem(`room-name-${roomId}`) || '');
    const [editingRoomName, setEditingRoomName] = useState(false);
    const [roomNameDraft, setRoomNameDraft] = useState('');

    // Pages
    const [pages, setPages] = useState([{ pageId: 'page-1', name: 'New Page', elements: [] }]);

    // UI
    const [chatOpen, setChatOpen] = useState(false);
    const [peerStreams, setPeerStreams] = useState(new Map());
    const [copied, setCopied] = useState(false);
    const [usersCollapsed, setUsersCollapsed] = useState(false);

    // Local media state (self-preview)
    const [localStream, setLocalStream] = useState(null);
    const [localMicOn, setLocalMicOn] = useState(false);
    const [localCamOn, setLocalCamOn] = useState(false);

    // Screen sharing state
    // 'self' = I am sharing, peerId = someone else's socketId, null = nobody
    const [screenSharerPeerId, setScreenSharerPeerId] = useState(null);
    const [screenSharerName, setScreenSharerName] = useState('');
    // ref for use inside socket callbacks
    const socketRef = useRef(null);

    useEffect(() => {
        const socketUrl = import.meta.env.VITE_BACKEND_URL || `http://localhost:5000`;
        const newSocket = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });
        setSocket(newSocket);
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            setMySocketId(newSocket.id);
            newSocket.emit('join-room', { roomId, username: user?.username });
        });

        newSocket.on('init-board', ({ pages: savedPages, isHost: host, roomName: savedName }) => {
            if (savedPages?.length > 0) setPages(savedPages);
            setIsHost(host);

            const sessionName = sessionStorage.getItem(`room-name-${roomId}`);
            if (savedName) {
                setRoomName(savedName);
            } else if (sessionName) {
                // If server didn't have a name yet, but we have one waiting in session storage from the Dashboard create action
                setRoomName(sessionName);
                newSocket.emit('rename-room', { roomId, name: sessionName });
            }
        });

        newSocket.on('user-list', (list) => setUsers(list));
        newSocket.on('you-are-host', () => setIsHost(true));
        newSocket.on('draw-lock-changed', ({ locked }) => setDrawLocked(locked));
        newSocket.on('room-name-changed', ({ name }) => setRoomName(name));
        newSocket.on('page-added', (page) => setPages(p => [...p, page]));
        newSocket.on('page-updated', ({ pageId, elements }) =>
            setPages(p => p.map(pg => pg.pageId === pageId ? { ...pg, elements } : pg)));
        newSocket.on('page-renamed', ({ pageId, name }) =>
            setPages(p => p.map(pg => pg.pageId === pageId ? { ...pg, name } : pg)));
        newSocket.on('page-deleted', ({ pageId }) =>
            setPages(prev => prev.filter(p => p.pageId !== pageId)));

        // Screen share events from other peers
        newSocket.on('screen-share-started', ({ peerId, username }) => {
            setScreenSharerPeerId(peerId);
            setScreenSharerName(username || 'Someone');
            // Automatically switch to meeting mode so user can see the stream
            setMeetingMode(true);
        });
        newSocket.on('screen-share-stopped', ({ peerId }) => {
            setScreenSharerPeerId(prev => prev === peerId ? null : prev);
            setScreenSharerName('');
        });

        return () => newSocket.disconnect();
    }, [roomId, user]);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleAddPage = useCallback(() => {
        const newPage = { pageId: `page-${Date.now()}`, name: 'New Page', elements: [] };
        setPages(p => [...p, newPage]);
        socket?.emit('add-page', { roomId, page: newPage });
    }, [socket, roomId]);

    const handlePageUpdate = useCallback((pageId, elements) => {
        setPages(p => p.map(pg => pg.pageId === pageId ? { ...pg, elements } : pg));
        socket?.emit('update-page', { roomId, pageId, elements });
    }, [socket, roomId]);

    const handleMediaState = useCallback(({ micOn, camOn, stream }) => {
        setLocalMicOn(micOn);
        setLocalCamOn(camOn);
        setLocalStream(stream || null);
    }, []);

    const handleScreenSharer = useCallback((val) => {
        if (val === 'self') {
            setScreenSharerPeerId('self');
            setScreenSharerName('You');
        } else {
            setScreenSharerPeerId(null);
            setScreenSharerName('');
        }
    }, []);

    const copyInvite = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const commitRoomName = () => {
        const name = roomNameDraft.trim() || roomName || roomId;
        setRoomName(name);
        sessionStorage.setItem(`room-name-${roomId}`, name);
        socket?.emit('rename-room', { roomId, name });
        setEditingRoomName(false);
    };

    // ─── Theme tokens ────────────────────────────────────────────────────────
    const bg = dark ? '#0a0a0a' : '#ffffff';
    const outerBg = dark ? '#0a0a0a' : '#f0f2f7';
    const border = dark ? 'rgba(255,255,255,0.05)' : '#e4e7ef';
    const text = dark ? '#f1f5f9' : '#111827';
    const muted = dark ? '#a3a3a3' : '#9ca3af';

    // ─── Loading ────────────────────────────────────────────────────────────
    if (!socket) return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: outerBg }}>
            <div style={{ width: '36px', height: '36px', border: `3px solid ${border}`, borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
            <p style={{ color: muted, fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.06em' }}>CONNECTING…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // Determine if anyone (self or remote) is screen sharing
    const hasScreenShare = screenSharerPeerId !== null;
    const screenStream = screenSharerPeerId === 'self'
        ? localStream   // self-preview of own screen
        : peerStreams?.get(screenSharerPeerId);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: outerBg, overflow: 'hidden' }}>

            {/* ── TOP BAR ─────────────────────────────────────────────────── */}
            <header style={{
                height: '50px', background: dark ? 'rgba(10,10,10,0.7)' : 'rgba(255,255,255,0.85)',
                borderBottom: `1px solid ${border}`, backdropFilter: 'blur(16px)',
                display: 'flex', alignItems: 'center', padding: '0 14px', gap: '10px',
                flexShrink: 0, zIndex: 100,
                transition: 'background 0.25s'
            }}>
                {/* Room Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    {editingRoomName ? (
                        <>
                            <input
                                autoFocus
                                value={roomNameDraft}
                                onChange={e => setRoomNameDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') commitRoomName(); if (e.key === 'Escape') setEditingRoomName(false); }}
                                placeholder={roomId}
                                style={{ background: 'transparent', border: 'none', outline: 'none', color: text, fontSize: '0.88rem', fontWeight: '700', minWidth: 0, maxWidth: '180px', borderBottom: `2px solid #6366f1` }}
                            />
                            <button onClick={commitRoomName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex' }}><Check size={14} /></button>
                            <button onClick={() => setEditingRoomName(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex' }}><X size={14} /></button>
                        </>
                    ) : (
                        <>
                            <span style={{ fontWeight: '800', fontSize: '0.88rem', color: text, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                {roomName || roomId}
                            </span>
                            {isHost && (
                                <button onClick={() => { setRoomNameDraft(roomName || ''); setEditingRoomName(true); }} title="Rename room"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: '2px' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#6366f1'}
                                    onMouseOut={e => e.currentTarget.style.color = muted}>
                                    <Pencil size={12} />
                                </button>
                            )}
                        </>
                    )}
                    <span style={{ padding: '2px 7px', borderRadius: '999px', background: dark ? 'rgba(16,185,129,0.1)' : '#dcfce7', color: '#10b981', fontSize: '0.62rem', fontWeight: '800', border: dark ? '1px solid rgba(16,185,129,0.2)' : '1px solid #bbf7d0', flexShrink: 0, boxShadow: dark ? '0 0 10px rgba(16,185,129,0.2)' : 'none' }}>● LIVE</span>
                </div>

                {/* Page count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 9px', background: dark ? 'rgba(255,255,255,0.03)' : '#f1f3f7', borderRadius: '8px', border: `1px solid ${border}` }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: text }}>📄 {pages.length} page{pages.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Users online */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 9px', background: dark ? 'rgba(255,255,255,0.03)' : '#f1f3f7', borderRadius: '8px', border: `1px solid ${border}` }}>
                    <Users size={12} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: dark ? '#34d399' : '#059669' }}>{users.length} online</span>
                </div>

                {/* Screen share banner */}
                {hasScreenShare && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '3px 10px', borderRadius: '8px',
                        background: dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
                        border: '1px solid #6ee7b7',
                        color: '#059669', fontSize: '0.73rem', fontWeight: '700'
                    }}>
                        <Monitor size={12} />
                        {screenSharerPeerId === 'self' ? 'You are sharing' : `${screenSharerName} is sharing`}
                    </div>
                )}

                <div style={{ flex: 1 }} />

                {/* Share */}
                <TopBtn onClick={copyInvite} active={copied} dark={dark} border={border} muted={muted}>
                    <Share2 size={13} /> {copied ? 'Copied!' : 'Share'}
                </TopBtn>

                {/* Chat */}
                <TopBtn onClick={() => setChatOpen(o => !o)} active={chatOpen} dark={dark} border={border} muted={muted}>
                    <MessageSquare size={13} /> Chat
                </TopBtn>

                {/* Host draw lock */}
                {isHost && (
                    <button
                        onClick={() => { const next = !drawLocked; setDrawLocked(next); socket.emit('toggle-draw-lock', { roomId, locked: next }); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${drawLocked ? '#fecaca' : '#bbf7d0'}`, background: drawLocked ? (dark ? 'rgba(220,38,38,0.1)' : '#fef2f2') : (dark ? 'rgba(22,163,74,0.1)' : '#f0fdf4'), color: drawLocked ? '#dc2626' : '#16a34a', fontWeight: '700', fontSize: '0.77rem' }}
                    >
                        {drawLocked ? '🔒 Locked' : '✏️ Open'}
                    </button>
                )}
            </header>

            {/* ── BODY ────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

                {/* Users panel (collapsible) */}
                <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
                    <div style={{ width: usersCollapsed ? 0 : undefined, overflow: usersCollapsed ? 'hidden' : 'visible', transition: 'width 0.25s ease', flexShrink: 0 }}>
                        <UsersPanel
                            users={users}
                            mySocketId={mySocketId}
                            peerStreams={peerStreams}
                            dark={dark}
                            localStream={localStream}
                            localMicOn={localMicOn}
                            localCamOn={localCamOn}
                            meetingMode={meetingMode}
                            screenSharerPeerId={screenSharerPeerId}
                        />
                    </div>
                    <CollapseBtn right onClick={() => setUsersCollapsed(v => !v)} dark={dark} border={border}>
                        {usersCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                    </CollapseBtn>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
                    {!meetingMode ? (
                        <Canvas
                            socket={socket}
                            roomId={roomId}
                            pages={pages}
                            onPageElementsChange={handlePageUpdate}
                            onAddPage={handleAddPage}
                            canDraw={isHost || !drawLocked}
                        />
                    ) : (
                        <MeetingGrid
                            users={users}
                            mySocketId={mySocketId}
                            peerStreams={peerStreams}
                            localStream={localStream}
                            localMicOn={localMicOn}
                            localCamOn={localCamOn}
                            dark={dark}
                            screenSharerPeerId={screenSharerPeerId}
                            screenStream={screenStream}
                            screenSharerName={screenSharerName}
                        />
                    )}
                </div>

                {/* Chat slideout */}
                {chatOpen && (
                    <div style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: '300px',
                        background: bg, borderLeft: `1px solid ${border}`,
                        display: 'flex', flexDirection: 'column', zIndex: 80,
                        boxShadow: '-4px 0 20px rgba(0,0,0,0.08)'
                    }}>
                        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: text }}>💬 Chat</span>
                            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex' }}><X size={15} /></button>
                        </div>
                        <Chat socket={socket} roomId={roomId} dark={dark} />
                    </div>
                )}
            </div>

            {/* Meeting controls */}
            <MeetingControls
                socket={socket} roomId={roomId} isHost={isHost}
                users={users} onLeave={() => navigate('/')}
                onPeerStreams={setPeerStreams}
                onMediaState={handleMediaState}
                meetingMode={meetingMode}
                onToggleMeetingMode={setMeetingMode}
                onScreenSharer={handleScreenSharer}
            />
        </div>
    );
};

// ── Google Meet-style Meeting Grid ───────────────────────────────────────────
const MeetingGrid = ({
    users, mySocketId, peerStreams, localStream,
    localMicOn, localCamOn, dark,
    screenSharerPeerId, screenStream, screenSharerName,
}) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];
    const hasScreen = screenSharerPeerId !== null && screenStream;

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: dark ? '#0a0a0a' : '#1a1a2e',
            overflow: 'hidden', height: '100%',
        }}>
            {/* Screen share spotlight */}
            {hasScreen && (
                <div style={{
                    flex: 2, position: 'relative', background: '#000',
                    borderBottom: '2px solid rgba(16,185,129,0.4)',
                    minHeight: 0
                }}>
                    <VideoTile stream={screenStream} muted={screenSharerPeerId === 'self'} />
                    {/* Screen label */}
                    <div style={{
                        position: 'absolute', top: '12px', left: '12px',
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        color: 'white', padding: '6px 14px', borderRadius: '8px',
                        fontSize: '0.78rem', fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        border: '1px solid rgba(16,185,129,0.5)'
                    }}>
                        <Monitor size={14} color="#10b981" />
                        {screenSharerPeerId === 'self' ? 'Your Screen' : `${screenSharerName}'s Screen`}
                    </div>
                </div>
            )}

            {/* Participants grid */}
            <div style={{
                flex: hasScreen ? 'none' : 1,
                height: hasScreen ? '180px' : undefined,
                display: 'flex',
                flexWrap: hasScreen ? 'nowrap' : 'wrap',
                gap: '8px',
                padding: '10px',
                overflowX: hasScreen ? 'auto' : 'hidden',
                overflowY: hasScreen ? 'hidden' : 'auto',
                alignContent: 'flex-start',
            }}>
                {users.map((u, i) => {
                    const isSelf = u.socketId === mySocketId;
                    const stream = isSelf ? localStream : peerStreams?.get(u.socketId);
                    const camActive = isSelf ? localCamOn : u.cameraOn;
                    const micActive = isSelf ? localMicOn : u.micOn;
                    const color = colors[i % colors.length];
                    const isSharingScreen = u.socketId === screenSharerPeerId ||
                        (isSelf && screenSharerPeerId === 'self');

                    return (
                        <div key={u.socketId || i} style={{
                            position: 'relative',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            background: dark ? '#111111' : '#222',
                            // When there's a screen share show small tiles, otherwise auto-fill grid
                            width: hasScreen ? '240px' : undefined,
                            flex: hasScreen ? '0 0 240px' : '1 1 300px',
                            aspectRatio: '16/9',
                            border: `1px solid ${isSelf ? '#6366f1' : isSharingScreen ? '#10b981' : 'rgba(255,255,255,0.05)'}`,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            transition: 'all 0.2s',
                        }}>
                            {stream && (camActive || isSharingScreen) ? (
                                <VideoTile stream={stream} muted={isSelf} />
                            ) : (
                                /* Avatar placeholder when cam off */
                                <div style={{
                                    width: '100%', height: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `linear-gradient(135deg, ${color}22, ${color}08)`,
                                }}>
                                    <div style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${color}, ${color}88)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '1.6rem', fontWeight: '800',
                                        boxShadow: `0 8px 24px ${color}55`,
                                    }}>
                                        {(u.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            )}

                            {/* Name + mic overlay */}
                            <div style={{
                                position: 'absolute', bottom: '10px', left: '10px', right: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                pointerEvents: 'none',
                            }}>
                                <div style={{
                                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                                    color: 'white', padding: '4px 10px', borderRadius: '20px',
                                    fontSize: '0.76rem', fontWeight: '600',
                                    maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {u.username}{isSelf ? ' (You)' : ''}{isSharingScreen ? ' 🖥️' : ''}
                                </div>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    background: micActive ? 'rgba(99,102,241,0.85)' : 'rgba(239,68,68,0.7)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: micActive ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
                                }}>
                                    {micActive ? <Mic size={13} color="white" /> : <MicOff size={13} color="white" />}
                                </div>
                            </div>

                            {/* HOST badge */}
                            {u.isHost && (
                                <div style={{
                                    position: 'absolute', top: '8px', left: '8px',
                                    background: '#6366f1', color: 'white',
                                    fontSize: '0.55rem', fontWeight: '800',
                                    padding: '2px 7px', borderRadius: '4px',
                                    letterSpacing: '0.06em', textTransform: 'uppercase'
                                }}>HOST</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ── Mini Components ─────────────────────────────────────────────── */
const TopBtn = ({ children, onClick, active, dark, border, muted }) => (
    <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
        background: active ? (dark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'transparent',
        border: `1px solid ${active ? '#a5b4fc' : border}`,
        color: active ? '#6366f1' : (dark ? '#94a3b8' : '#374151'),
        fontWeight: '600', fontSize: '0.77rem', transition: 'all 0.15s'
    }}>
        {children}
    </button>
);

const CollapseBtn = ({ children, onClick, dark, border, right }) => (
    <button onClick={onClick} style={{
        position: 'absolute',
        right: right ? '-14px' : undefined,
        top: '50%', transform: 'translateY(-50%)',
        zIndex: 60, width: '24px', height: '48px',
        background: dark ? '#1e2130' : 'white',
        border: `1px solid ${border}`,
        borderRadius: right ? '0 8px 8px 0' : '8px 0 0 8px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dark ? '#64748b' : '#9ca3af',
        boxShadow: right ? '2px 0 8px rgba(0,0,0,0.06)' : '-2px 0 8px rgba(0,0,0,0.06)'
    }}>
        {children}
    </button>
);

export default Whiteboard;
