import { useState } from 'react';
import { Plus, File, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PagesPanel = ({ pages, currentPageId, onSwitchPage, onAddPage, onRenamePage, onDeletePage, dark }) => {
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const bg = dark ? '#1a1d2e' : '#ffffff';
    const border = dark ? '#2c2f4a' : '#e4e7ef';
    const text = dark ? '#f1f5f9' : '#111827';
    const muted = dark ? '#64748b' : '#9ca3af';
    const subtle = dark ? '#13151f' : '#f8f9fb';

    const startRename = (page, e) => { e.stopPropagation(); setEditingId(page.pageId); setEditName(page.name); };
    const commitRename = (pageId) => { if (editName.trim()) onRenamePage(pageId, editName.trim()); setEditingId(null); };

    return (
        <aside style={{ width: '136px', flex: '0 0 136px', background: bg, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', transition: 'background 0.25s' }}>

            {/* Header */}
            <div style={{ padding: '8px 10px 6px', borderBottom: `1px solid ${border}` }}>
                <button
                    onClick={onAddPage}
                    style={{ width: '100%', padding: '7px', background: dark ? 'rgba(99,102,241,0.1)' : '#f1f3f7', border: `1.5px dashed ${dark ? '#4f46e5' : '#a5b4fc'}`, borderRadius: '9px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: '700', fontSize: '0.78rem', transition: 'all 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(99,102,241,0.2)' : '#eef2ff'}
                    onMouseOut={e => e.currentTarget.style.background = dark ? 'rgba(99,102,241,0.1)' : '#f1f3f7'}
                >
                    <Plus size={13} /> New Page
                </button>
            </div>

            <p style={{ padding: '7px 10px 4px', fontSize: '0.62rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: muted }}>Pages</p>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 8px' }}>
                <AnimatePresence>
                    {pages.map((page, idx) => {
                        const isActive = page.pageId === currentPageId;
                        const isEditing = editingId === page.pageId;
                        return (
                            <motion.div
                                key={page.pageId}
                                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                                onClick={() => !isEditing && onSwitchPage(page.pageId)}
                                onDoubleClick={e => startRename(page, e)}
                                style={{
                                    borderRadius: '9px', marginBottom: '5px', cursor: 'pointer',
                                    background: isActive ? (dark ? 'rgba(99,102,241,0.15)' : '#eef2ff') : (dark ? 'rgba(255,255,255,0.02)' : 'white'),
                                    border: `1px solid ${isActive ? (dark ? '#4f46e5' : '#c7d2fe') : border}`,
                                    transition: 'all 0.15s ease',
                                    boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.12)' : 'none'
                                }}
                            >
                                {/* Thumbnail */}
                                <div style={{ height: '56px', borderRadius: '8px 8px 0 0', background: isActive ? (dark ? 'rgba(99,102,241,0.1)' : '#e0e7ff') : subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${border}` }}>
                                    <File size={16} style={{ opacity: 0.25, color: isActive ? '#6366f1' : (dark ? '#94a3b8' : '#6b7280') }} />
                                </div>
                                {/* Label */}
                                <div style={{ padding: '4px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px' }}>
                                    {isEditing ? (
                                        <>
                                            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') commitRename(page.pageId); if (e.key === 'Escape') setEditingId(null); }}
                                                onClick={e => e.stopPropagation()}
                                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: dark ? '#a5b4fc' : '#4338ca', fontSize: '0.72rem', fontWeight: '700', minWidth: 0 }}
                                            />
                                            <Check size={11} style={{ cursor: 'pointer', color: '#10b981', flexShrink: 0 }}
                                                onClick={e => { e.stopPropagation(); commitRename(page.pageId); }} />
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '0.72rem', fontWeight: isActive ? '700' : '500', color: isActive ? (dark ? '#a5b4fc' : '#4338ca') : muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {page.name || 'New Page'}
                                            </span>
                                            {pages.length > 1 && (
                                                <Trash2 size={10} style={{ opacity: 0, cursor: 'pointer', flexShrink: 0, color: '#ef4444' }}
                                                    onClick={e => { e.stopPropagation(); onDeletePage(page.pageId); }}
                                                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                                    onMouseOut={e => e.currentTarget.style.opacity = '0'}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </aside>
    );
};

export default PagesPanel;
