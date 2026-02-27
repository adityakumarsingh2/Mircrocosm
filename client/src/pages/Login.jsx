import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Zap, Shield, Users, ArrowRight } from 'lucide-react';

const FEATURES = [
    { icon: <Zap size={20} />, title: 'Real-time Sync', desc: 'Zero-latency drawing across all participants.', color: '#f59e0b' },
    { icon: <Users size={20} />, title: 'Collaborate Live', desc: 'Invite anyone with a link. No account needed to join.', color: '#6366f1' },
    { icon: <Shield size={20} />, title: 'Host Controls', desc: 'Lock drawing, manage participants, and control sessions.', color: '#10b981' },
];

const Login = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleGoogleLogin = () => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`;
        window.location.href = `${backendUrl}/auth/google`;
    };

    if (user) { navigate('/dashboard'); return null; }

    return (
        <div style={{ minHeight: 'calc(100vh - 58px)', background: '#fafbff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Subtle background blobs */}
            <div style={{ position: 'absolute', width: '600px', height: '600px', left: '55%', top: '-100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: '400px', height: '400px', left: '-80px', bottom: '0', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', width: '100%', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

                {/* Announce pill */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '999px', background: '#eef2ff', border: '1px solid #c7d2fe', fontSize: '0.78rem', fontWeight: '700', color: '#4338ca', marginBottom: '1.5rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                        Real-time collaborative whiteboarding
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                    style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1.1, maxWidth: '800px', marginBottom: '1.25rem', color: '#0f172a' }}>
                    Where ideas become <br />
                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        visual masterpieces.
                    </span>
                </motion.h1>

                {/* Sub */}
                <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: '#64748b', maxWidth: '560px', fontWeight: '400', lineHeight: 1.7, marginBottom: '2.2rem' }}>
                    Microcosm lets teams draw, annotate and brainstorm together in real-time on a shared canvas.
                </motion.p>

                {/* CTA */}
                <motion.button
                    onClick={handleGoogleLogin}
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }}
                    whileHover={{ scale: 1.03, boxShadow: '0 8px 28px rgba(99,102,241,0.35)' }}
                    whileTap={{ scale: 0.98 }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 32px', borderRadius: '14px', background: '#6366f1', color: 'white', fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.28)', fontFamily: 'inherit' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google <ArrowRight size={16} />
                </motion.button>

                {/* Trust line */}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                    style={{ marginTop: '14px', fontSize: '0.78rem', color: '#94a3b8', fontWeight: '500' }}>
                    Free to use · No credit card required
                </motion.p>

                {/* Features */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%', marginTop: '4.5rem', maxWidth: '780px' }}>
                    {FEATURES.map(f => (
                        <div key={f.title} style={{ padding: '1.25rem', borderRadius: '14px', background: 'white', border: '1px solid #e4e7ef', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: f.color + '18', border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '10px' }}>{f.icon}</div>
                            <h3 style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '5px', color: '#111827' }}>{f.title}</h3>
                            <p style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
