import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Plus, Sun, Moon, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [searchFocused, setSearchFocused] = useState(false);
    const dark = theme === 'dark';
    const isLanding = location.pathname === '/';

    const bg = isLanding ? (dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)') : (dark ? 'rgba(10,10,10,0.8)' : 'rgba(255,255,255,0.8)');
    const border = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const text = dark ? '#f9fafb' : '#111827';
    const muted = dark ? '#9ca3af' : '#6b7280';
    const hover = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    // Update query params as user types
    const handleSearch = (e) => {
        const query = e.target.value;
        if (location.pathname !== '/dashboard') {
            navigate(`/dashboard?q=${query}`);
        } else {
            if (query) navigate(`?q=${query}`, { replace: true });
            else navigate(location.pathname, { replace: true });
        }
    };

    const newBoard = () => {
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        navigate(`/whiteboard/${id}`);
    };

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 200,
            background: bg,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${border}`,
            boxShadow: dark ? '0 4px 30px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.03)',
        }}>
            <div style={{
                maxWidth: '1400px', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: '64px', padding: '0 1.5rem', gap: '1rem'
            }}>

                {/* ── Logo ──────────────────────────────── */}
                <Link to={user ? "/dashboard" : "/"} style={{
                    display: 'flex', alignItems: 'center',
                    textDecoration: 'none', width: '220px', flexShrink: 0
                }}>
                    {/* Brand icon */}
                    <div style={{
                        height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                    }}>
                        <img src="/microcosm-logo.png" alt="Microcosm Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain', filter: dark ? 'drop-shadow(0 0 10px rgba(99,102,241,0.4))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))' }} />
                    </div>
                </Link>

                {user && (
                    <>
                        {/* ── Global Search Bar ─────────────── */}
                        <div style={{ flex: 1, maxWidth: '500px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                width: '100%', height: '36px',
                                background: searchFocused ? (dark ? '#000' : '#fff') : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                                border: searchFocused ? `1px solid #6366f1` : `1px solid ${border}`,
                                borderRadius: '8px',
                                padding: '0 12px',
                                transition: 'all 0.2s',
                                boxShadow: searchFocused ? `0 0 0 1px #6366f1` : 'none'
                            }}>
                                <Search size={14} color={muted} style={{ minWidth: '14px' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={searchParams.get('q') || ''}
                                    onChange={handleSearch}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    style={{ 
                                        width: '100%', background: 'transparent', border: 'none', 
                                        outline: 'none', color: text, fontSize: '0.85rem',
                                        fontFamily: '"Inter", sans-serif'
                                    }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: muted, fontSize: '0.7rem', fontWeight: '600', border: `1px solid ${border}`, borderRadius: '4px', padding: '2px 4px', background: hover }}>
                                    <span>⌘</span><span>K</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Actions & Profile ─────────────── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '250px', justifyContent: 'flex-end', flexShrink: 0 }}>
                            {/* ── Theme toggle ──────────────────── */}
                            <motion.button
                                onClick={toggleTheme}
                                title={`Switch to ${dark ? 'light' : 'dark'} mode`}
                                whileHover={{ backgroundColor: hover, color: text }}
                                initial={{ backgroundColor: 'transparent', color: muted }}
                                animate={{ color: muted }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '8px',
                                    border: `1px solid transparent`,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                {dark ? <Sun size={18} /> : <Moon size={18} />}
                            </motion.button>

                        {/* ── New Board CTA ─────────────────── */}
                        <motion.button
                            onClick={newBoard}
                            whileHover={{ boxShadow: dark ? '0 0 15px rgba(255,255,255,0.15)' : '0 4px 12px rgba(0,0,0,0.08)' }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0 16px', height: '34px',
                                borderRadius: '8px',
                                border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                background: dark ? 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%), #111827' : '#ffffff',
                                color: text,
                                fontWeight: '600', fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s', flexShrink: 0,
                                fontFamily: "'Inter','Segoe UI',sans-serif",
                                boxShadow: dark ? '0 0 10px rgba(255,255,255,0.05)' : '0 2px 8px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Plus size={14} strokeWidth={2.5} /> New project
                        </motion.button>

                            {/* ── Divider ───────────────────────── */}
                            <div style={{ width: '1px', height: '20px', background: border, flexShrink: 0 }} />

                            {/* ── Avatar + username pill ────────── */}
                            <motion.div
                                whileHover={{ backgroundColor: hover }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '4px 12px 4px 4px',
                                    borderRadius: '999px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    flexShrink: 0,
                                    backgroundColor: 'transparent'
                                }}
                            >
                                {user.avatar
                                    ? <img src={user.avatar} alt={user.username}
                                        style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                                    : <div style={{
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        background: '#0b99ff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '0.85rem', fontWeight: '800', flexShrink: 0
                                    }}>
                                        {user.username?.charAt(0).toUpperCase()}
                                    </div>
                                }
                                <span style={{
                                    fontWeight: '600', fontSize: '0.9rem', color: text,
                                    maxWidth: '120px', overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>{user.username}</span>
                            </motion.div>

                            {/* ── Logout ────────────────────────── */}
                            <motion.button
                                onClick={logout}
                                title="Sign out"
                                whileHover={{ color: '#ef4444', backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2' }}
                                initial={{ backgroundColor: 'transparent', color: muted }}
                                animate={{ color: muted }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '8px',
                                    border: `1px solid transparent`,
                                    cursor: 'pointer', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                <LogOut size={16} />
                            </motion.button>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
