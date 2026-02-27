import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Sparkles, Video, Layers, PenTool, MousePointer2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Startup-styled FakeCursor
const FakeCursor = ({ x, y, color, name, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, x: x - 150, y: y + 150 }}
        animate={{ opacity: [0, 1, 1, 0], x: [x - 150, x, x + 30, x + 150], y: [y + 150, y, y - 30, y - 150] }}
        transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}
    >
        <MousePointer2 size={24} fill={color} color="white" style={{ filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.4))' }} />
        <div style={{ background: color, color: 'white', padding: '4px 10px', borderRadius: '6px', borderTopLeftRadius: 0, fontSize: '0.75rem', fontWeight: '600', marginTop: '-2px', marginLeft: '12px', display: 'inline-block', boxShadow: `0px 4px 12px ${color}80`, letterSpacing: '0.02em', fontFamily: '"Inter", sans-serif', userSelect: 'none', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
            {name}
        </div>
    </motion.div>
);

const Landing = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const dark = theme === 'dark';

    // Premium Startup Palette & Cursor Colors
    const bg = dark ? '#000000' : '#fafafa';
    const text = dark ? '#ffffff' : '#111827';
    const muted = dark ? '#a1a1aa' : '#6b7280';
    const glowColor = dark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)';
    const brandColors = ['#f24e1e', '#0b99ff', '#10b981', '#a259ff', '#ff7262'];

    return (
        <div style={{ minHeight: 'calc(100vh - 60px)', background: bg, overflowX: 'hidden', color: text, fontFamily: '"Inter", sans-serif', transition: 'background 0.3s' }}>
            
            {/* Premium Glowing Background Mesh (Animated) */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
                <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '-20%', width: '80vw', height: '600px', background: `radial-gradient(ellipse at top, ${glowColor}, transparent 70%)` }} />
                <motion.div animate={{ x: [-20, 20, -20], y: [-10, 10, -10] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '20%', left: '-10%', width: '50vw', height: '500px', background: `radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 60%)` }} />
                <motion.div animate={{ x: [20, -20, 20], y: [10, -10, 10] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '40%', right: '-10%', width: '40vw', height: '600px', background: `radial-gradient(circle, rgba(16, 185, 129, 0.05), transparent 60%)` }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: dark ? 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)' : 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px', opacity: 0.5, maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 80%)' }} />
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                
                {/* ── HERO SECTION ── */}
                <section style={{ padding: '8rem 2rem 5rem', textAlign: 'center', position: 'relative' }}>
                    
                    {/* Animated Fake Cursors */}
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                        <FakeCursor x={250} y={150} color={brandColors[0]} name="Aditya" delay={0.5} />
                        <FakeCursor x={1000} y={100} color={brandColors[1]} name="Priya" delay={2} />
                        <FakeCursor x={350} y={350} color={brandColors[2]} name="Rahul" delay={3.5} />
                    </div>

                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, type: 'spring', damping: 20, stiffness: 100 }} style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)', fontSize: '0.85rem', fontWeight: '500', color: muted }}>
                            <Sparkles size={14} color="#8b5cf6" />
                            <span>Introducing Microcosm 2.0</span>
                        </div>
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, type: 'spring', damping: 20, stiffness: 100 }} 
                        style={{ fontSize: 'clamp(3.5rem, 8vw, 6.5rem)', fontWeight: '800', lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: '1.5rem', maxWidth: '1000px', margin: '0 auto 1.5rem', background: dark ? 'linear-gradient(to bottom right, #ffffff, #a1a1aa)' : 'linear-gradient(to bottom right, #111827, #6b7280)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    >
                        The modern standard<br/>for collaboration.
                    </motion.h1>

                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, type: 'spring', damping: 20, stiffness: 100 }} style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', color: muted, maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.6, fontWeight: '400' }}>
                        Microcosm connects your entire team in a lightning-fast, highly-engineered workspace. Brainstorm, design, and build better ideas, seamlessly.
                    </motion.p>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, type: 'spring', damping: 20, stiffness: 100 }} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Link to={user ? "/dashboard" : "/login"} style={{ textDecoration: 'none' }}>
                            <motion.button 
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                                style={{ padding: '14px 32px', borderRadius: '999px', background: dark ? '#ffffff' : '#111827', color: dark ? '#000000' : '#ffffff', fontWeight: '600', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: dark ? '0 0 20px rgba(255,255,255,0.15)' : '0 10px 30px rgba(17,24,39,0.2)' }}
                            >
                                {user ? 'Go to Dashboard' : 'Start building free'} <ArrowRight size={16} strokeWidth={2.5} />
                            </motion.button>
                        </Link>
                    </motion.div>
                </section>

                {/* ── BENTO GRID / FEATURES SHOWCASE ── */}
                <section style={{ padding: '4rem 2rem', perspective: '1200px' }}>
                        <motion.div 
                        initial={{ opacity: 0, y: 40 }} 
                        whileInView={{ opacity: 1, y: 0 }} 
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                        style={{ 
                            background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', 
                            border: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                            borderRadius: '24px', 
                            padding: '1rem', 
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)'
                        }}
                    >
                        {/* Premium Startup cards with staggered scroll reveal */}
                        {[
                            { title: 'Infinite Canvas', desc: 'Draw, type, and map complex ideas on an unbounded, ultra-smooth surface.', color: '#6366f1', icon: <PenTool size={24} /> },
                            { title: 'Integrated Comms', desc: 'Instant WebRTC audio and video built right into your workspace. No more link sharing.', color: '#ec4899', icon: <Video size={24} /> },
                            { title: 'Local & Cloud Sync', desc: 'Multiplayer persistence powers real-time updates and seamless state management.', color: '#10b981', icon: <Layers size={24} /> },
                        ].map((feat, i) => (
                            <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: 0.1 + (i * 0.15), type: 'spring', damping: 20, stiffness: 100 }}
                            style={{ 
                                background: dark ? 'rgba(20,20,20,0.4)' : '#ffffff', 
                                borderRadius: '16px', 
                                padding: '2.5rem 2rem', 
                                display: 'flex', flexDirection: 'column', gap: '1rem', 
                                border: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', 
                                position: 'relative', overflow: 'hidden',
                                transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                                boxShadow: dark ? 'none' : '0 10px 30px -10px rgba(0,0,0,0.05)'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                                e.currentTarget.style.boxShadow = dark ? '0 20px 40px -20px rgba(0,0,0,0.5)' : '0 20px 40px -20px rgba(0,0,0,0.1)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                                e.currentTarget.style.boxShadow = dark ? 'none' : '0 10px 30px -10px rgba(0,0,0,0.05)';
                            }}
                            >
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100px', background: `radial-gradient(circle at center 0, ${feat.color}20, transparent 70%)`, pointerEvents: 'none', transition: 'opacity 0.3s ease' }} />
                                
                                <motion.div 
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    style={{ color: feat.color, marginBottom: '0.5rem', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0)' }}
                                >
                                   {feat.icon}
                                </motion.div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em', color: text }}>{feat.title}</h3>
                                <p style={{ fontSize: '1.05rem', color: muted, margin: 0, lineHeight: 1.6, fontWeight: '400' }}>{feat.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* ── CTA SECTION ── */}
                <section style={{ padding: '8rem 2rem 10rem', textAlign: 'center' }}>
                     <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: '800', letterSpacing: '-0.04em', marginBottom: '2rem', lineHeight: 1, color: text }}>
                         Ready to get started?
                     </h2>
                     <p style={{ color: muted, fontSize: '1.1rem', marginBottom: '3rem' }}>Join the next generation of creators.</p>
                     <Link to={user ? "/dashboard" : "/login"} style={{ textDecoration: 'none' }}>
                         <motion.button 
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                            style={{ padding: '16px 40px', borderRadius: '999px', background: dark ? '#ffffff' : '#111827', color: dark ? '#000000' : '#ffffff', fontWeight: '600', fontSize: '1.1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: dark ? '0 0 20px rgba(255,255,255,0.1)' : '0 10px 30px rgba(17,24,39,0.15)' }}
                        >
                             Sign up today
                         </motion.button>
                     </Link>
                </section>

            </div>
        </div>
    );
};

export default Landing;
