import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Clock, Layout, ArrowRight, FileText, Layers, Grid, Share2, ExternalLink, Search } from 'lucide-react';
import axios from 'axios';

const TEMPLATES = [
    { id: 'blank', title: 'Blank Canvas', desc: 'Start fresh on an empty whiteboard.', icon: <Grid size={22} />, color: '#0b99ff' },
    { id: 'brainstorm', title: 'Brainstorm Board', desc: 'Sticky notes and free-form mind mapping.', icon: <Layers size={22} />, color: '#10b981' },
    { id: 'planning', title: 'Sprint Planning', desc: 'Backlog, in-progress and done columns.', icon: <FileText size={22} />, color: '#f59e0b' },
];

const Home = () => {
    const [roomName, setRoomName] = useState('');
    const [roomID, setRoomID] = useState('');
    const [rooms, setRooms] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [activeTab, setActiveTab] = useState('recent');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loading } = useAuth();
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const glowColor = dark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.03)';
    
    const searchQuery = searchParams.get('q') || '';

    useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);

    useEffect(() => {
        if (!user) return;
        const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`;
        axios.get(`${backendUrl}/api/rooms`, { withCredentials: true })
            .then(r => setRooms(r.data))
            .catch(err => console.error('Error fetching rooms:', err))
            .finally(() => setFetching(false));
    }, [user]);

    const handleCreateRoom = async () => {
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        if (roomName.trim()) sessionStorage.setItem(`room-name-${id}`, roomName.trim());
        navigate(`/whiteboard/${id}`);
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (roomID.trim()) navigate(`/whiteboard/${roomID.trim().toUpperCase()}`);
    };

    const filteredRooms = useMemo(() => {
        if (!searchQuery) return rooms;
        const q = searchQuery.toLowerCase();
        return rooms.filter(r => 
            (r.name && r.name.toLowerCase().includes(q)) || 
            (r.roomId && r.roomId.toLowerCase().includes(q))
        );
    }, [rooms, searchQuery]);

    if (loading || !user) return null;

    const tabs = [
        { id: 'recent', label: 'Recents', icon: <Clock size={15} /> },
        { id: 'templates', label: 'Drafts & Templates', icon: <Layers size={15} /> },
        { id: 'shared', label: 'Shared with me', icon: <Users size={15} /> },
    ];

    // Premium Startup Dashboard Palette
    const bg = dark ? '#0a0a0a' : '#fafafa';           // Main content background
    const sidebarBg = dark ? '#111111' : '#f5f5f5';    // Sidebar background
    const surface = dark ? '#171717' : '#ffffff';      // Card background
    const border = dark ? '#2a2a2a' : '#e5e5e5';
    const text = dark ? '#f3f4f6' : '#111827';
    const muted = dark ? '#9ca3af' : '#6b7280';
    const hover = dark ? '#262626' : '#f3f4f6';

    return (
        <div style={{ minHeight: 'calc(100vh - 64px)', background: bg, display: 'flex', fontFamily: '"Inter", sans-serif', position: 'relative', overflow: 'hidden' }}>
            
            {/* Premium Subtle Ambient Background Mesh */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
                <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '-10%', left: '10%', width: '50vw', height: '600px', background: `radial-gradient(ellipse at top, ${glowColor}, transparent 60%)` }} />
                <motion.div animate={{ x: [-10, 10, -10], y: [-5, 5, -5] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '10%', right: '-10%', width: '40vw', height: '500px', background: `radial-gradient(circle, rgba(139, 92, 246, 0.03), transparent 60%)` }} />
            </div>

            {/* ── Left Sidebar ───────────────────────────────────── */}
            <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
                width: '240px', borderRight: `1px solid ${border}`, background: sidebarBg,
                padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0,
                position: 'relative', zIndex: 1
            }}>
                <div style={{ padding: '0 8px', marginBottom: '1rem', color: muted, fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Your files
                </div>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                            background: activeTab === tab.id ? hover : 'transparent',
                            color: activeTab === tab.id ? text : muted,
                            fontWeight: activeTab === tab.id ? '600' : '500',
                            fontSize: '0.88rem', transition: 'all 0.15s', textAlign: 'left', width: '100%'
                        }}
                        onMouseOver={e => { if(activeTab !== tab.id) e.currentTarget.style.background = dark ? '#1a1a1a' : '#fafafa' }}
                        onMouseOut={e => { if(activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </motion.div>

            {/* ── Main Content Area ──────────────────────────────── */}
            <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

                    {/* ── Header ───────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: text, letterSpacing: '-0.02em', marginBottom: '8px' }}>
                                {searchQuery ? `Search results for "${searchQuery}"` : 'Recents'}
                            </h1>
                            <p style={{ color: muted, fontSize: '0.9rem' }}>{searchQuery ? `Found ${filteredRooms.length} boards` : 'Jump back in or start something new.'}</p>
                        </motion.div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/whiteboard/${Math.random().toString(36).substring(2, 8).toUpperCase()}`)} 
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '0 16px', height: '36px', borderRadius: '8px', border: 'none',
                                    background: dark ? '#ffffff' : '#111827', color: dark ? '#000000' : '#ffffff', fontWeight: '600', fontSize: '0.85rem',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: '"Inter", sans-serif',
                                    boxShadow: dark ? '0 0 10px rgba(255,255,255,0.1)' : '0 4px 12px rgba(17,24,39,0.1)'
                                }}
                            >
                                <Plus size={16} strokeWidth={2.5} /> New project
                            </motion.button>
                        </div>
                    </div>

                    {!searchQuery && (
                        /* ── Action Cards Row ──────────────────────────────── */
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                            style={{ display: 'flex', gap: '16px', marginBottom: '3rem', flexWrap: 'wrap' }}
                        >
                            {/* Create Board Card */}
                            <div style={{ flex: '1 1 300px', background: surface, border: `1px solid ${border}`, borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.03)' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: text }}>Name your next idea</p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Board name..."
                                        value={roomName}
                                        onChange={e => setRoomName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                                        style={{ fontSize: '0.875rem', padding: '6px 12px', height: '34px', flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', transition: 'all 0.2s' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = `0 0 0 1px #6366f1`; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <button
                                        onClick={handleCreateRoom}
                                        style={{ padding: '0 16px', height: '34px', borderRadius: '8px', border: 'none', background: dark ? '#222' : '#f3f4f6', color: text, cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'background 0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.background = dark ? '#333' : '#e5e7eb'}
                                        onMouseOut={e => e.currentTarget.style.background = dark ? '#222' : '#f3f4f6'}
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>

                            {/* Join Room Card */}
                            <div style={{ flex: '1 1 300px', background: surface, border: `1px solid ${border}`, borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.03)' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: text }}>Join an existing file</p>
                                <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="File code e.g. AB12CD"
                                        value={roomID}
                                        onChange={e => setRoomID(e.target.value)}
                                        style={{ fontSize: '0.875rem', padding: '6px 12px', height: '34px', flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: '8px', color: text, outline: 'none', textTransform: 'uppercase', transition: 'all 0.2s' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = `0 0 0 1px #6366f1`; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <button type="submit" style={{ padding: '0 12px', height: '34px', borderRadius: '8px', border: `1px solid ${border}`, background: hover, color: text, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <ArrowRight size={16} />
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Tab Content ───────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
                        variants={{
                            hidden: { opacity: 0 },
                            show: {
                                opacity: 1,
                                transition: { staggerChildren: 0.05, delayChildren: 0.05 }
                            }
                        }}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}
                    >
                        {/* RECENT / SEARCH RESULTS */}
                        {activeTab === 'recent' && (
                            fetching
                                ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} dark={dark} />)
                                : filteredRooms.length === 0
                                    ? <EmptyState icon={searchQuery ? <Search size={36} /> : <Layout size={36} />} title={searchQuery ? "No results found" : "No boards yet"} sub={searchQuery ? `We couldn't find any boards matching "${searchQuery}".` : 'Create your first board above.'} muted={muted} />
                                    : filteredRooms.map(room => (
                                        <RoomCard key={room._id} room={room} onClick={() => navigate(`/whiteboard/${room.roomId}`)} dark={dark} border={border} surface={surface} text={text} muted={muted} />
                                    ))
                        )}

                        {/* TEMPLATES */}
                        {activeTab === 'templates' && TEMPLATES.map(tpl => (
                            <motion.div
                                key={tpl.id}
                                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 100 } } }}
                                whileHover={{ y: -4, boxShadow: dark ? '0 10px 25px rgba(0,0,0,0.4)' : '0 10px 25px rgba(0,0,0,0.08)' }}
                                onClick={handleCreateRoom}
                                style={{
                                    padding: '1.25rem', borderRadius: '8px', cursor: 'pointer',
                                    background: surface, border: `1px solid ${border}`,
                                    display: 'flex', flexDirection: 'column', gap: '12px',
                                    transition: 'border-color 0.2s ease',
                                    boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: tpl.color + '18', border: `1px solid transparent`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tpl.color }}>{tpl.icon}</div>
                                <div>
                                    <h3 style={{ fontWeight: '600', fontSize: '0.93rem', marginBottom: '4px', color: text }}>{tpl.title}</h3>
                                    <p style={{ color: muted, fontSize: '0.82rem', lineHeight: 1.5 }}>{tpl.desc}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0b99ff', fontWeight: '600', fontSize: '0.8rem', marginTop: 'auto' }}>
                                    <ExternalLink size={12} /> Use Template
                                </div>
                            </motion.div>
                        ))}

                        {/* SHARED */}
                        {activeTab === 'shared' && (
                            fetching
                                ? [1, 2].map(i => <SkeletonCard key={i} dark={dark} />)
                                : <EmptyState icon={<Share2 size={36} />} title="Nothing shared yet" sub="Join a board via link and it will appear here." muted={muted} />
                        )}
                    </motion.div>
                </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

/* ── Sub-components ─────────────────────────────────────────────── */
const RoomCard = ({ room, onClick, dark, border, surface, text, muted }) => (
    <motion.div
        variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 100 } } }}
        whileHover={{ y: -4, boxShadow: dark ? '0 10px 25px rgba(0,0,0,0.4)' : '0 10px 25px rgba(0,0,0,0.08)' }}
        onClick={onClick}
        style={{
            cursor: 'pointer',
            background: surface, border: `1px solid ${border}`, borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            transition: 'border-color 0.2s ease, transform 0.2s ease',
            boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.02)'
        }}
    >
        {/* Thumbnail area */}
        <div style={{ 
            height: '140px', background: dark ? '#111' : '#f9f9f9', 
            borderBottom: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Minimal glowing abstract shapes */}
            <div style={{ width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', borderRadius: '50%', position: 'absolute', top: '10px', left: '20px' }} />
            <div style={{ width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)', borderRadius: '50%', position: 'absolute', bottom: '-20px', right: '10px' }} />
            {/* Glassmorphic inner card */}
            <div style={{ width: '80px', height: '50px', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', backdropFilter: 'blur(10px)', zIndex: 1 }} />
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h4 style={{ fontWeight: '600', fontSize: '0.9rem', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                {room.name || 'Untitled'}
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: muted, fontWeight: '500' }}>
                    {new Date(room.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <span style={{ fontSize: '0.67rem', padding: '2px 6px', borderRadius: '4px', background: dark ? '#222' : '#f4f4f5', color: muted, fontWeight: '600', fontFamily: 'monospace' }}>
                    {room.roomId}
                </span>
            </div>
        </div>
    </motion.div>
);

const SkeletonCard = ({ dark }) => (
    <motion.div 
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="skeleton" 
        style={{ height: '180px', borderRadius: '14px', background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', border: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }} 
    />
);

const EmptyState = ({ icon, title, sub, muted }) => (
    <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 20 } } }} style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0' }}>
        <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity }} style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '50%', color: '#6366f1', boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)' }}>
                {icon}
            </div>
        </motion.div>
        <p style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '8px' }}>{title}</p>
        <p style={{ fontSize: '0.95rem', color: muted, maxWidth: '300px', margin: '0 auto', lineHeight: 1.5 }}>{sub}</p>
    </motion.div>
);

export default Home;
