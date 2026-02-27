import { useState, useEffect, useRef } from 'react';
import { Send, Smile } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Palette helper ──────────────────────────────────────────────────────── */
const USER_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ec4899',
    '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316',
];

function colorFor(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return USER_COLORS[Math.abs(h) % USER_COLORS.length];
}

/* ── Avatar ──────────────────────────────────────────────────────────────── */
const Avatar = ({ name, size = 28 }) => {
    const color = colorFor(name);
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}, ${color}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: size * 0.4, fontWeight: '800',
            flexShrink: 0, boxShadow: `0 2px 8px ${color}44`,
        }}>
            {(name || '?').charAt(0).toUpperCase()}
        </div>
    );
};

/* ── Quick emoji list ────────────────────────────────────────────────────── */
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '💡'];

/* ── Main Chat Component ─────────────────────────────────────────────────── */
const Chat = ({ socket, roomId, dark = false }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [showEmoji, setShowEmoji] = useState(false);
    const { user } = useAuth();
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    /* ── Colours ── */
    const bg = dark ? '#1a1d2e' : '#ffffff';
    const surfaceBg = dark ? '#12141f' : '#f8f9fc';
    const border = dark ? '#2c2f4a' : '#e4e7ef';
    const text = dark ? '#f1f5f9' : '#111827';
    const muted = dark ? '#64748b' : '#9ca3af';
    const inputBg = dark ? '#252840' : '#f1f3f7';
    const myBubble = dark ? { bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.3)', color: '#c7d2fe' }
        : { bg: '#eef2ff', border: '#c7d2fe', color: '#3730a3' };
    const theirBubble = dark ? { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }
        : { bg: '#f3f4f6', border: '#e5e7eb', color: '#1f2937' };

    useEffect(() => {
        socket.on('chat-message', (data) => setMessages(prev => [...prev, data]));
        return () => socket.off('chat-message');
    }, [socket]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = (e) => {
        e?.preventDefault();
        const txt = message.trim();
        if (!txt) return;
        socket.emit('chat-message', {
            roomId,
            message: txt,
            user: user?.username || 'Guest',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setMessage('');
        setShowEmoji(false);
        inputRef.current?.focus();
    };

    const insertEmoji = (em) => {
        setMessage(prev => prev + em);
        setShowEmoji(false);
        inputRef.current?.focus();
    };

    /* Group consecutive messages by same sender */
    const grouped = messages.map((msg, i) => ({
        ...msg,
        isFirst: i === 0 || messages[i - 1].user !== msg.user,
        isLast: i === messages.length - 1 || messages[i + 1].user !== msg.user,
    }));

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: bg }}>

            {/* ── Messages ─────────────────────────────────────────────── */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: '2px',
                background: surfaceBg,
            }}>
                {messages.length === 0 && (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '40px 20px', gap: '10px',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: dark ? 'rgba(99,102,241,0.1)' : '#eef2ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem',
                        }}>💬</div>
                        <p style={{ color: muted, fontSize: '0.78rem', fontWeight: '600', textAlign: 'center', margin: 0 }}>
                            No messages yet.<br />Say hello! 👋
                        </p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {grouped.map((msg, i) => {
                        const isMe = msg.user === (user?.username || 'Guest');
                        const bubble = isMe ? myBubble : theirBubble;
                        const showMeta = msg.isFirst;

                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.18 }}
                                style={{
                                    display: 'flex',
                                    flexDirection: isMe ? 'row-reverse' : 'row',
                                    alignItems: 'flex-end',
                                    gap: '8px',
                                    marginTop: showMeta ? '10px' : '2px',
                                }}
                            >
                                {/* Avatar — only on last message in group */}
                                <div style={{ width: '28px', flexShrink: 0 }}>
                                    {msg.isLast && !isMe && <Avatar name={msg.user} size={28} />}
                                    {msg.isLast && isMe && <Avatar name={msg.user} size={28} />}
                                </div>

                                {/* Bubble group */}
                                <div style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '78%', gap: '2px',
                                }}>
                                    {/* Sender name + time */}
                                    {showMeta && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: isMe ? '0 4px 0 0' : '0 0 0 4px',
                                            flexDirection: isMe ? 'row-reverse' : 'row',
                                        }}>
                                            {!isMe && (
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: '800',
                                                    color: colorFor(msg.user),
                                                    letterSpacing: '0.02em',
                                                }}>
                                                    {msg.user}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.63rem', color: muted, fontWeight: '500' }}>
                                                {msg.timestamp}
                                            </span>
                                        </div>
                                    )}

                                    {/* Bubble */}
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: isMe
                                            ? (msg.isFirst ? '16px 16px 4px 16px' : msg.isLast ? '16px 4px 16px 16px' : '16px 4px 4px 16px')
                                            : (msg.isFirst ? '16px 16px 16px 4px' : msg.isLast ? '4px 16px 16px 16px' : '4px 16px 16px 4px'),
                                        background: bubble.bg,
                                        border: `1px solid ${bubble.border}`,
                                        color: bubble.color,
                                        fontSize: '0.875rem',
                                        lineHeight: '1.5',
                                        wordBreak: 'break-word',
                                        boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                                    }}>
                                        {msg.message}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={chatEndRef} />
            </div>

            {/* ── Emoji Tray ───────────────────────────────────────────── */}
            <AnimatePresence>
                {showEmoji && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        style={{
                            display: 'flex', gap: '6px', flexWrap: 'wrap',
                            padding: '10px 14px',
                            borderTop: `1px solid ${border}`,
                            background: bg,
                        }}
                    >
                        {QUICK_EMOJIS.map(em => (
                            <button
                                key={em}
                                onClick={() => insertEmoji(em)}
                                style={{
                                    fontSize: '1.3rem', background: 'none', border: 'none',
                                    cursor: 'pointer', padding: '4px 6px',
                                    borderRadius: '8px',
                                    transition: 'background 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}
                                onMouseOut={e => e.currentTarget.style.background = 'none'}
                            >
                                {em}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Input Bar ────────────────────────────────────────────── */}
            <div style={{
                padding: '10px 12px',
                borderTop: `1px solid ${border}`,
                background: bg,
                flexShrink: 0,
            }}>
                <form onSubmit={send} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Emoji toggle */}
                    <button
                        type="button"
                        onClick={() => setShowEmoji(v => !v)}
                        title="Quick emojis"
                        style={{
                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                            background: showEmoji ? (dark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'transparent',
                            border: `1px solid ${showEmoji ? '#a5b4fc' : border}`,
                            color: showEmoji ? '#6366f1' : muted,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                    >
                        <Smile size={16} />
                    </button>

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Message…"
                        style={{
                            flex: 1,
                            padding: '9px 14px',
                            background: inputBg,
                            border: `1px solid ${border}`,
                            borderRadius: '12px',
                            color: text,
                            fontSize: '0.875rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            minWidth: 0,
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                        onBlur={e => e.currentTarget.style.borderColor = border}
                    />

                    {/* Send */}
                    <button
                        type="submit"
                        disabled={!message.trim()}
                        title="Send"
                        style={{
                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                            background: message.trim() ? '#6366f1' : (dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'),
                            border: `1px solid ${message.trim() ? '#6366f1' : border}`,
                            color: message.trim() ? 'white' : muted,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: message.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            boxShadow: message.trim() ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                        }}
                    >
                        <Send size={15} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
