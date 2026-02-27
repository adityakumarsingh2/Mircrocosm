import { useRef, useEffect } from 'react';
import { Mic, MicOff, VideoOff, Monitor } from 'lucide-react';

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444'];

/* VideoTile – renders a <video> element bound to a MediaStream */
export const VideoTile = ({ stream, muted = false, camActive, micActive, isSharing }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current) return;
        if (stream) {
            ref.current.srcObject = null;
            ref.current.srcObject = stream;
            // Attempt to play (browsers require user gesture for unmuted, but muted is fine)
            ref.current.play().catch(() => { });
        } else {
            ref.current.srcObject = null;
        }
    }, [stream, camActive, micActive, isSharing]);

    return (
        <video
            ref={ref}
            autoPlay
            playsInline
            muted={muted}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }}
        />
    );
};

const UsersPanel = ({
    users = [],
    mySocketId,
    peerStreams,
    dark,
    localStream,
    localMicOn,
    localCamOn,
    screenSharerPeerId,
}) => {
    const bg = dark ? '#0a0a0a' : '#f8f9fb';
    const panel = dark ? '#111111' : '#ffffff';
    const border = dark ? 'rgba(255,255,255,0.05)' : '#e4e7ef';
    const text = dark ? '#f1f5f9' : '#111827';
    const mutedColor = dark ? '#a3a3a3' : '#94a3b8';

    return (
        <div style={{
            width: '230px', flexShrink: 0,
            background: bg,
            borderRight: `1px solid ${border}`,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', height: '100%',
            transition: 'background 0.25s'
        }}>
            {/* ── Header ─────────────────────────────────── */}
            <div style={{
                padding: '14px 14px 10px',
                borderBottom: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: panel, flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Participants
                    </span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6366f1', background: dark ? 'rgba(99,102,241,0.12)' : '#eef2ff', padding: '2px 8px', borderRadius: '999px' }}>
                    {users.length} online
                </span>
            </div>

            {/* ── User Cards ─────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {users.map((u, i) => {
                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    const isSelf = u.socketId === mySocketId;
                    const stream = isSelf ? localStream : peerStreams?.get(u.socketId);
                    const camActive = isSelf ? localCamOn : u.cameraOn;
                    const micActive = isSelf ? localMicOn : u.micOn;
                    const isSharing = u.socketId === screenSharerPeerId ||
                        (isSelf && screenSharerPeerId === 'self');

                    return (
                        <div key={u.socketId || i} style={{
                            borderRadius: '12px',
                            background: panel,
                            border: `1px solid ${isSharing ? '#10b981' : border}`,
                            overflow: 'hidden',
                            boxShadow: isSharing
                                ? '0 0 12px rgba(16,185,129,0.25)'
                                : (dark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)'),
                            flexShrink: 0,
                            position: 'relative',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}>
                            {/* Video / Avatar area */}
                            <div style={{
                                width: '100%', aspectRatio: '16/9',
                                background: '#111',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative', overflow: 'hidden'
                            }}>
                                {stream ? (
                                    <>
                                        <VideoTile stream={stream} muted={isSelf} camActive={camActive} micActive={micActive} isSharing={isSharing} />
                                        {!camActive && !isSharing && (
                                            <div style={{
                                                position: 'absolute', inset: 0, background: '#111',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                            }}>
                                                <div style={{
                                                    width: '46px', height: '46px', borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontSize: '1.1rem', fontWeight: '800',
                                                    boxShadow: `0 4px 12px ${color}44`
                                                }}>
                                                    {(u.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <VideoOff size={12} style={{ color: '#475569' }} />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '46px', height: '46px', borderRadius: '50%',
                                            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontSize: '1.1rem', fontWeight: '800',
                                            boxShadow: `0 4px 12px ${color}44`
                                        }}>
                                            {(u.username || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <VideoOff size={12} style={{ color: '#475569' }} />
                                    </div>
                                )}

                                {/* HOST badge */}
                                {u.isHost && (
                                    <div style={{
                                        position: 'absolute', top: '6px', left: '6px',
                                        background: '#6366f1', color: 'white',
                                        fontSize: '0.52rem', fontWeight: '800',
                                        padding: '2px 6px', borderRadius: '4px',
                                        letterSpacing: '0.05em'
                                    }}>HOST</div>
                                )}

                                {/* Screen sharing badge */}
                                {isSharing && (
                                    <div style={{
                                        position: 'absolute', top: '6px', right: '6px',
                                        background: 'rgba(16,185,129,0.9)', color: 'white',
                                        fontSize: '0.52rem', fontWeight: '800',
                                        padding: '2px 6px', borderRadius: '4px',
                                        display: 'flex', alignItems: 'center', gap: '3px'
                                    }}>
                                        <Monitor size={9} /> SHARING
                                    </div>
                                )}

                                {/* MIC indicator overlay */}
                                <div style={{
                                    position: 'absolute', bottom: '6px', right: '6px',
                                    background: micActive ? 'rgba(99,102,241,0.85)' : 'rgba(0,0,0,0.55)',
                                    borderRadius: '6px', padding: '3px 6px',
                                    display: 'flex', alignItems: 'center', gap: '3px'
                                }}>
                                    {micActive
                                        ? <Mic size={11} style={{ color: 'white' }} />
                                        : <MicOff size={11} style={{ color: '#94a3b8' }} />
                                    }
                                    {micActive && (
                                        <span style={{ fontSize: '0.55rem', color: 'white', fontWeight: '700' }}>ON</span>
                                    )}
                                </div>
                            </div>

                            {/* Name row */}
                            <div style={{
                                padding: '7px 10px',
                                borderTop: `1px solid ${border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.76rem', fontWeight: '700', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {u.username || 'User'}{isSelf ? ' (You)' : ''}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    {micActive && <Mic size={11} style={{ color: '#6366f1' }} />}
                                    {isSharing && <Monitor size={11} style={{ color: '#10b981' }} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UsersPanel;
