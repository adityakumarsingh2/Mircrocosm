import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
    MousePointer2, Lasso, Plus, Hand, Ruler, Trash2, Undo2, Redo2,
    Download, Eraser, Type, Zap, Image as ImageIcon, Focus,
    FileText, ZoomIn, ZoomOut, Copy, Wand2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── A4 Constants ────────────────────────────────────────────────────────── */
const A4_W = 794;
const A4_H = 1123;
const PAGE_GAP = 40;   // px gap between pages
const PAGE_MARGIN = 48; // horizontal margin from edge of viewport

const PEN_COLORS = [
    { color: '#dc2626', label: 'Red' },
    { color: '#2563eb', label: 'Blue' },
    { color: '#7c3aed', label: 'Purple' },
    { color: '#db2777', label: 'Pink' },
    { color: '#eab308', label: 'Yellow' },
    { color: '#16a34a', label: 'Green' },
    { color: '#0891b2', label: 'Cyan' },
    { color: '#111827', label: 'Black' },
];
const PEN_SIZES = [2, 4, 6, 10, 16];
const STICKY_COLORS = ['#fef08a', '#86efac', '#93c5fd', '#f9a8d4', '#fca5a5', '#c4b5fd'];
const BG_OPTIONS = [
    { id: 'blank', label: '⬜ Blank' },
    { id: 'grid', label: '# Grid' },
    { id: 'ruled', label: '≡ Ruled' },
    { id: 'dotted', label: '· Dotted' },
];

/* ─── Draw background ─────────────────────────────────────────────────────── */
function drawBackground(ctx, bg, dark) {
    ctx.clearRect(0, 0, A4_W, A4_H);
    ctx.fillStyle = dark ? '#1e2029' : '#ffffff';
    ctx.fillRect(0, 0, A4_W, A4_H);
    if (bg === 'grid') {
        ctx.strokeStyle = dark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.1)';
        ctx.lineWidth = 0.8;
        for (let x = 0; x <= A4_W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, A4_H); ctx.stroke(); }
        for (let y = 0; y <= A4_H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(A4_W, y); ctx.stroke(); }
    } else if (bg === 'ruled') {
        ctx.strokeStyle = dark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.16)';
        ctx.lineWidth = 0.8;
        for (let y = 40; y <= A4_H; y += 28) { ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(A4_W - 20, y); ctx.stroke(); }
        ctx.strokeStyle = dark ? 'rgba(239,68,68,0.28)' : 'rgba(239,68,68,0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(60, A4_H); ctx.stroke();
    } else if (bg === 'dotted') {
        ctx.fillStyle = dark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.22)';
        for (let x = 28; x < A4_W; x += 28)
            for (let y = 28; y < A4_H; y += 28) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 2 * Math.PI); ctx.fill(); }
    }
}

/* ─── Render element ──────────────────────────────────────────────────────── */
function renderElement(ctx, el) {
    if (el.type === 'eraser') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        if (el.points?.length) { ctx.moveTo(el.points[0].x, el.points[0].y); el.points.forEach(p => ctx.lineTo(p.x, p.y)); }
        ctx.stroke();
        ctx.restore();
        return;
    }
    if (el.type === 'text') {
        ctx.font = `${el.bold ? 'bold ' : ''}${el.fontSize || 18}px Inter, sans-serif`;
        ctx.fillStyle = el.color;
        (el.text || '').split('\n').forEach((line, i) => ctx.fillText(line, el.x, el.y + i * (el.fontSize || 18) * 1.4));
        return;
    }
    if (el.type === 'sticky') {
        const { x, y, w, h, bgColor, text } = el;
        ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        ctx.fillStyle = bgColor || '#fef08a';
        ctx.beginPath();
        const r = 8;
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath(); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.moveTo(x + w - 14, y); ctx.lineTo(x + w, y + 14); ctx.lineTo(x + w, y); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.font = '13px Inter,sans-serif';
        const pad = 12, maxW = w - pad * 2; let lineY = y + 26;
        (text || '').split('\n').forEach(line => {
            const words = line.split(' '); let cur = '';
            words.forEach(word => {
                const test = cur ? cur + ' ' + word : word;
                if (ctx.measureText(test).width > maxW && cur) { ctx.fillText(cur, x + pad, lineY); cur = word; lineY += 18; } else cur = test;
            });
            if (cur) { ctx.fillText(cur, x + pad, lineY); lineY += 18; }
        });
        return;
    }
    if (el.type === 'image' && el.dataUrl) {
        if (!window.__imageCache) window.__imageCache = {};
        let img = window.__imageCache[el.id];
        if (!img) {
            img = new Image(); img.src = el.dataUrl;
            img.onload = () => { window.__imageCache[el.id] = img; };
            window.__imageCache[el.id] = img;
        }
        if (img.complete) ctx.drawImage(img, el.x, el.y, el.w, el.h);
        return;
    }
    ctx.beginPath();
    ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (el.type) {
        case 'pencil':
            if (!el.points?.length) return;
            ctx.moveTo(el.points[0].x, el.points[0].y);
            el.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke(); break;
        case 'line': ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke(); break;
        case 'rect': ctx.strokeRect(el.x1, el.y1, el.x2 - el.x1, el.y2 - el.y1); break;
        case 'circle': { const r = Math.hypot(el.x2 - el.x1, el.y2 - el.y1); ctx.arc(el.x1, el.y1, r, 0, 2 * Math.PI); ctx.stroke(); break; }
    }
}

/* ─── Shape Recognition & Optimization ────────────────────────────────────── */
function recognizeShape(points, color, size) {
    if (!points || points.length < 10) return null;

    const start = points[0];
    const end = points[points.length - 1];

    let pathLength = 0;
    for (let i = 1; i < points.length; i++) {
        pathLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const directDist = Math.hypot(end.x - start.x, end.y - start.y);

    // 1. Line Detection (Stricter optimization: paths shouldn't meander too much)
    if (directDist > 30 && pathLength / directDist < 1.08) {
        return { id: Date.now(), type: 'line', color, size, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
    }

    // Checking for closed loops (Circle or Rectangle - More forgiving loop gap)
    if (directDist < 60 && pathLength > 50) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);
        const cx = minX + width / 2;
        const cy = minY + height / 2;
        const aspectRatio = Math.max(width, height) / Math.min(width, height);

        // 2. Circle Detection: aspect ratio ~ 1.5 (More forgiving!)
        if (aspectRatio < 1.5) {
            const radius = (width + height) / 4;
            let avgDev = 0;
            points.forEach(p => avgDev += Math.abs(Math.hypot(p.x - cx, p.y - cy) - radius));
            avgDev /= points.length;
            // More forgiving deviation (0.35 instead of 0.25)
            if (avgDev / radius < 0.35) {
                return { id: Date.now(), type: 'circle', color, size, x1: cx, y1: cy, x2: cx + radius, y2: cy };
            }
        }

        // 3. Rectangle Detection
        let edgeDeviation = 0;
        points.forEach(p => {
            edgeDeviation += Math.min(
                Math.abs(p.x - minX), Math.abs(p.x - maxX),
                Math.abs(p.y - minY), Math.abs(p.y - maxY)
            );
        });
        edgeDeviation /= points.length;
        if (edgeDeviation / Math.min(width, height) < 0.25) { // Slightly more forgiving rectangle points
            return { id: Date.now(), type: 'rect', color, size, x1: minX, y1: minY, x2: maxX, y2: maxY };
        }
    }
    return null;
}

/* ─── Scribble Detection & Intersection Logic ───────────────────────────── */
function isScribble(points) {
    if (!points || points.length < 30) return false;

    // Detect zig-zags by counting significant directional changes on the X or Y axis
    let zigzags = 0;
    let currentDir = 0;

    for (let i = 2; i < points.length; i++) {
        // Look at X axis primarily for scribbles, or Y axis if vertical
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;

        if (Math.abs(dx) > Math.abs(dy)) {
            const dir = Math.sign(dx);
            if (dir !== 0 && currentDir !== 0 && dir !== currentDir) zigzags++;
            if (dir !== 0) currentDir = dir;
        } else {
            const dir = Math.sign(dy);
            if (dir !== 0 && currentDir !== 0 && dir !== currentDir) zigzags++;
            if (dir !== 0) currentDir = dir;
        }
    }

    // A scribble usually has many sharp changes in direction over a short path area
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });

    const scribbleArea = Math.max(1, (maxX - minX) * (maxY - minY));
    // High density of direction changes in a relatively small area indicates a "scratch out"
    return zigzags >= 10 && points.length / Math.sqrt(scribbleArea) > 0.4;
}

function intersects(scribblePoints, element) {
    // Get bounding box of element
    let elMinX = Infinity, elMaxX = -Infinity, elMinY = Infinity, elMaxY = -Infinity;

    if (element.type === 'pencil' || element.type === 'eraser') {
        element.points.forEach(p => {
            if (p.x < elMinX) elMinX = p.x;
            if (p.x > elMaxX) elMaxX = p.x;
            if (p.y < elMinY) elMinY = p.y;
            if (p.y > elMaxY) elMaxY = p.y;
        });
    } else if (element.type === 'line' || element.type === 'rect') {
        elMinX = Math.min(element.x1, element.x2);
        elMaxX = Math.max(element.x1, element.x2);
        elMinY = Math.min(element.y1, element.y2);
        elMaxY = Math.max(element.y1, element.y2);
    } else if (element.type === 'circle') {
        const r = Math.hypot(element.x2 - element.x1, element.y2 - element.y1);
        elMinX = element.x1 - r; elMaxX = element.x1 + r;
        elMinY = element.y1 - r; elMaxY = element.y1 + r;
    } else if (element.type === 'image' || element.type === 'sticky') {
        elMinX = element.x; elMaxX = element.x + (element.w || 100);
        elMinY = element.y; elMaxY = element.y + (element.h || 100);
    } else if (element.type === 'text') {
        elMinX = element.x; elMaxX = element.x + 100; // rough width estimate
        elMinY = element.y - (element.fontSize || 18); elMaxY = element.y;
    }

    // Expand bounding box slightly (grace area)
    const padding = 15;
    elMinX -= padding; elMaxX += padding; elMinY -= padding; elMaxY += padding;

    // Check if a significant portion of the scribble points are inside the element's bounds
    let insideCount = 0;
    scribblePoints.forEach(p => {
        if (p.x >= elMinX && p.x <= elMaxX && p.y >= elMinY && p.y <= elMaxY) insideCount++;
    });

    // If 15% or more of the scribble points fall inside the element bounds, it's considered scratched out
    return (insideCount / scribblePoints.length) > 0.15;
}

/* ══════════════════════════════════════════════════════════════════════════
   SinglePage  – renders one A4 sheet (bg canvas + draw canvas)
══════════════════════════════════════════════════════════════════════════ */
const SinglePage = ({
    page, index, darkMode, bgStyle, zoom,
    activeTool, activeColor, activeSize, activeStickyColor, autoShape,
    canDraw, socket, roomId,
    onElementsChange,
    cursors, isActivePage, setActivePage,
    overlaysForPage, setOverlaysForPage,
    liveElements = []
}) => {
    const bgRef = useRef(null);
    const drawRef = useRef(null);

    const elementsRef = useRef(page.elements || []);
    const historyRef = useRef([page.elements || []]);
    const historyIdxRef = useRef(0);
    const actionRef = useRef('none');
    const drawingEl = useRef(null);

    /* ── Emit ────────────────────────────────────────────────────── */
    const emit = useCallback(() => {
        const all = [...elementsRef.current];
        socket?.emit('update-page', { roomId, pageId: page.pageId, elements: all });
        onElementsChange?.(page.pageId, all);
    }, [socket, roomId, page.pageId, onElementsChange]);

    /* ── History ─────────────────────────────────────────────────── */
    const pushHistory = useCallback((els) => {
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push([...els]);
        historyIdxRef.current = historyRef.current.length - 1;
    }, []);

    /* ── Redraw ──────────────────────────────────────────────────── */
    const redrawAll = useCallback(() => {
        const canvas = drawRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, A4_W, A4_H);
        elementsRef.current
            .filter(e => e.type !== 'text' && e.type !== 'sticky')
            .forEach(el => renderElement(ctx, el));

        liveElements.forEach(el => {
            if (el.type !== 'text' && el.type !== 'sticky') renderElement(ctx, el);
        });

        if (drawingEl.current && drawingEl.current.type !== 'text' && drawingEl.current.type !== 'sticky') {
            renderElement(ctx, drawingEl.current);
        }
    }, [liveElements]);

    useEffect(() => {
        redrawAll();
    }, [redrawAll]);

    /* ── Sync page data ──────────────────────────────────────────── */
    useLayoutEffect(() => {
        elementsRef.current = page.elements || [];
        historyRef.current = [page.elements || []];
        historyIdxRef.current = 0;
        const textEls = (page.elements || []).filter(e => e.type === 'text' || e.type === 'sticky');
        setOverlaysForPage(textEls.map(e => ({ ...e, editing: false })));
        redrawAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page.pageId]);

    /* ── Sync remote page update ─────────────────────────────────── */
    useEffect(() => {
        const incoming = page.elements || [];
        elementsRef.current = incoming;

        if (actionRef.current === 'none') {
            historyRef.current = [incoming];
            historyIdxRef.current = 0;
        }

        redrawAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page.elements]);

    /* ── Background ──────────────────────────────────────────────── */
    useEffect(() => {
        const bgCanvas = bgRef.current;
        if (!bgCanvas) return;
        const ctx = bgCanvas.getContext('2d');
        drawBackground(ctx, bgStyle, darkMode);
    }, [bgStyle, darkMode]);

    /* ── Undo / Redo ─────────────────────────────────────────────── */
    useEffect(() => {
        const handleKey = (e) => {
            if (!isActivePage) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (historyIdxRef.current > 0) { historyIdxRef.current--; elementsRef.current = [...historyRef.current[historyIdxRef.current]]; redrawAll(); emit(); }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                if (historyIdxRef.current < historyRef.current.length - 1) { historyIdxRef.current++; elementsRef.current = [...historyRef.current[historyIdxRef.current]]; redrawAll(); emit(); }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isActivePage, emit, redrawAll]);

    /* ── Convert event coords to canvas coords ───────────────────── */
    const getPos = (e) => {
        const rect = drawRef.current.getBoundingClientRect();
        return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
    };

    /* ── Mouse Down ──────────────────────────────────────────────── */
    const onMouseDown = useCallback((e) => {
        if (!canDraw || e.button !== 0) return;
        setActivePage(page.pageId);
        const pos = getPos(e);

        if (activeTool === 'text') {
            const id = Date.now();
            const ov = { id, type: 'text', x: pos.x, y: pos.y, text: '', color: activeColor, fontSize: 18, editing: true };
            setOverlaysForPage(prev => [...prev, ov]);
            return;
        }
        if (activeTool === 'sticky') {
            const id = Date.now();
            const w = 160, h = 140;
            const ov = { id, type: 'sticky', x: pos.x, y: pos.y, w, h, bgColor: activeStickyColor, text: '', editing: true };
            setOverlaysForPage(prev => [...prev, ov]);
            return;
        }
        if (activeTool === 'hand' || activeTool === 'select' || activeTool === 'lasso') return;

        actionRef.current = 'drawing';
        const id = Date.now();

        if (activeTool === 'pencil' || activeTool === 'eraser') {
            drawingEl.current = { id, type: activeTool, color: activeColor, size: activeSize, points: [pos] };
        } else if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle') {
            drawingEl.current = { id, type: activeTool, color: activeColor, size: activeSize, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        } else if (activeTool === 'image') {
            const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
            input.onchange = () => {
                const file = input.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = new Image();
                    img.onload = () => {
                        const aspect = img.width / img.height;
                        const w = Math.min(240, A4_W / 2); const h = w / aspect;
                        const el = { id: Date.now(), type: 'image', x: pos.x, y: pos.y, w, h, dataUrl: evt.target.result };
                        elementsRef.current = [...elementsRef.current, el];
                        const ctx = drawRef.current.getContext('2d');
                        ctx.drawImage(img, el.x, el.y, w, h);
                        pushHistory(elementsRef.current); emit();
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            };
            input.click();
            actionRef.current = 'none';
            return;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canDraw, activeTool, activeColor, activeSize, activeStickyColor, zoom, page.pageId]);

    /* ── Mouse Move ──────────────────────────────────────────────── */
    const onMouseMove = useCallback((e) => {
        if (!canDraw) return;
        const pos = getPos(e);
        socket?.emit('cursor-move', { roomId, x: pos.x, y: pos.y, pageId: page.pageId });

        if (actionRef.current !== 'drawing' || !drawingEl.current) return;
        const el = drawingEl.current;
        const ctx = drawRef.current.getContext('2d');

        if (el.type === 'pencil' || el.type === 'eraser') {
            el.points.push(pos);
            if (el.type === 'eraser') {
                ctx.save(); ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath();
                const pts = el.points; if (pts.length >= 2) { ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
                ctx.restore();
            } else {
                ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath();
                const pts = el.points; if (pts.length >= 2) { ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
            }
        } else if (el.type === 'line' || el.type === 'rect' || el.type === 'circle') {
            el.x2 = pos.x; el.y2 = pos.y;
            redrawAll();
            renderElement(ctx, el);
        }

        socket?.emit('live-draw', { roomId, pageId: page.pageId, element: el });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canDraw, roomId, page.pageId, socket, zoom, redrawAll]);

    /* ── Mouse Up ────────────────────────────────────────────────── */
    const onMouseUp = useCallback(() => {
        if (actionRef.current !== 'drawing' || !drawingEl.current) { actionRef.current = 'none'; return; }

        let finalEl = { ...drawingEl.current };

        // Handle Pencil events
        if (finalEl.type === 'pencil') {

            // Scribble To Erase Detection
            if (isScribble(finalEl.points)) {
                // Find all elements that intersect with this scribble and remove them
                const prevLength = elementsRef.current.length;

                // Also handle text/sticky overlays that might be scratched out
                const remainingOverlays = [];
                overlaysForPage.forEach(ov => {
                    if (!intersects(finalEl.points, ov)) remainingOverlays.push(ov);
                });

                if (remainingOverlays.length !== overlaysForPage.length) {
                    setOverlaysForPage(remainingOverlays);
                }

                // Filter out scratched elements from the main canvas element array
                elementsRef.current = elementsRef.current.filter(el => !intersects(finalEl.points, el));

                // If anything was actually erased, we *do not* add the scribble stroke itself
                if (elementsRef.current.length !== prevLength || remainingOverlays.length !== overlaysForPage.length) {
                    drawingEl.current = null;
                    actionRef.current = 'none';
                    pushHistory(elementsRef.current);
                    redrawAll();
                    emit();
                    return; // early exit: we erased something, don't keep drawing the scribble
                }
            }

            // Shape Recognition Integration (Only if we didn't just erase something!)
            if (autoShape) {
                const recognized = recognizeShape(finalEl.points, finalEl.color, finalEl.size);
                if (recognized) finalEl = recognized;
            }
        }

        elementsRef.current = [...elementsRef.current, finalEl];
        drawingEl.current = null;
        actionRef.current = 'none';
        pushHistory(elementsRef.current);
        redrawAll(); // Redraw in case shape was snapped or erased
        emit();
    }, [pushHistory, emit, autoShape, redrawAll, overlaysForPage, setOverlaysForPage]);

    /* ── Commit text/sticky overlay ──────────────────────────────── */
    const commitOverlay = useCallback((ov) => {
        if (!ov.text?.trim()) { setOverlaysForPage(prev => prev.filter(o => o.id !== ov.id)); return; }
        const existing = elementsRef.current.find(e => e.id === ov.id);
        if (!existing) {
            elementsRef.current = [...elementsRef.current, { ...ov, editing: false }];
        } else {
            elementsRef.current = elementsRef.current.map(e => e.id === ov.id ? { ...e, ...ov, editing: false } : e);
        }
        setOverlaysForPage(prev => prev.map(o => o.id === ov.id ? { ...o, editing: false } : o));
        pushHistory(elementsRef.current);
        emit();
    }, [pushHistory, emit]);

    /* ── Export PNG ──────────────────────────────────────────────── */
    const exportPNG = useCallback(() => {
        const out = document.createElement('canvas'); out.width = A4_W; out.height = A4_H;
        const ctx = out.getContext('2d');
        ctx.drawImage(bgRef.current, 0, 0);
        ctx.drawImage(drawRef.current, 0, 0);
        const link = document.createElement('a');
        link.download = `page-${index + 1}.png`; link.href = out.toDataURL('image/png'); link.click();
    }, [index]);

    /* ── Drop image ──────────────────────────────────────────────── */
    const onDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0]; if (!file || !file.type.startsWith('image/')) return;
        const rect = drawRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const aspect = img.width / img.height;
                const w = Math.min(240, A4_W / 2); const h = w / aspect;
                const el = { id: Date.now(), type: 'image', x, y, w, h, dataUrl: evt.target.result };
                elementsRef.current = [...elementsRef.current, el];
                const ctx = drawRef.current.getContext('2d');
                ctx.drawImage(img, el.x, el.y, w, h);
                pushHistory(elementsRef.current); emit();
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    }, [zoom, pushHistory, emit]);

    /* ── Helper: clear ───────────────────────────────────────────── */
    const clearPage = useCallback(() => {
        elementsRef.current = []; setOverlaysForPage([]); pushHistory([]); redrawAll(); emit();
    }, [pushHistory, redrawAll, emit]);

    // Expose clear and export via ref (parent calls them via context if needed)
    const scaled = `scale(${zoom})`;

    return (
        <div
            style={{ position: 'relative', width: A4_W, height: A4_H, transform: scaled, transformOrigin: 'top center', flexShrink: 0 }}
            onClick={() => setActivePage(page.pageId)}
        >
            {/* BG canvas */}
            <canvas ref={bgRef} width={A4_W} height={A4_H}
                style={{ position: 'absolute', top: 0, left: 0, borderRadius: '2px', display: 'block' }} />

            {/* Draw canvas */}
            <canvas ref={drawRef} width={A4_W} height={A4_H}
                style={{ position: 'absolute', top: 0, left: 0, borderRadius: '2px', display: 'block', cursor: !canDraw ? 'not-allowed' : activeTool === 'eraser' ? 'cell' : activeTool === 'text' ? 'text' : activeTool === 'hand' ? 'grab' : 'crosshair' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onContextMenu={e => e.preventDefault()}
            />

            {/* Text / Sticky overlays */}
            {overlaysForPage.map(ov => ov.type === 'text' ? (
                <div key={ov.id} style={{ position: 'absolute', left: ov.x * zoom, top: (ov.y - 4) * zoom, minWidth: '120px', zIndex: 10 }}>
                    {ov.editing ? (
                        <textarea autoFocus value={ov.text}
                            onChange={e => setOverlaysForPage(prev => prev.map(o => o.id === ov.id ? { ...o, text: e.target.value } : o))}
                            onBlur={() => commitOverlay(ov)}
                            onKeyDown={e => { if (e.key === 'Escape') commitOverlay({ ...ov, text: ov.text }); }}
                            style={{ border: '1.5px dashed #6366f1', background: 'transparent', color: ov.color, font: `${ov.fontSize || 18}px Inter,sans-serif`, resize: 'both', minWidth: '120px', minHeight: '30px', outline: 'none', padding: '2px', borderRadius: '4px', lineHeight: 1.4 }}
                        />
                    ) : (
                        <div onDoubleClick={() => setOverlaysForPage(prev => prev.map(o => o.id === ov.id ? { ...o, editing: true } : o))}
                            style={{ color: ov.color, font: `${ov.fontSize || 18}px Inter,sans-serif`, whiteSpace: 'pre-wrap', cursor: 'default', lineHeight: 1.4 }}>
                            {ov.text}
                        </div>
                    )}
                </div>
            ) : (
                <div key={ov.id} style={{ position: 'absolute', left: ov.x * zoom, top: ov.y * zoom, width: ov.w * zoom, height: ov.h * zoom, zIndex: 10, background: ov.bgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, width: 14, height: 14, background: 'rgba(0,0,0,0.1)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                    {ov.editing ? (
                        <textarea autoFocus value={ov.text} placeholder="Type here..."
                            onChange={e => setOverlaysForPage(prev => prev.map(o => o.id === ov.id ? { ...o, text: e.target.value } : o))}
                            onBlur={() => commitOverlay(ov)}
                            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', padding: '12px', fontSize: '13px', fontFamily: 'Inter,sans-serif', resize: 'none', outline: 'none', color: 'rgba(0,0,0,0.75)' }}
                        />
                    ) : (
                        <div onDoubleClick={() => setOverlaysForPage(prev => prev.map(o => o.id === ov.id ? { ...o, editing: true } : o))}
                            style={{ padding: '12px', fontSize: '13px', fontFamily: 'Inter,sans-serif', color: 'rgba(0,0,0,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'default' }}>
                            {ov.text}
                        </div>
                    )}
                </div>
            ))}

            {/* Remote cursors for this page */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
                {Object.entries(cursors).filter(([, c]) => c.pageId === page.pageId).map(([uid, { username, x, y }]) => (
                    <div key={uid} style={{ position: 'absolute', left: x * zoom, top: y * zoom, transform: 'translate(-2px,-2px)' }}>
                        <svg width="14" height="18" viewBox="0 0 16 20"><polygon points="0,0 0,16 4,12 8,20 10,19 6,11 12,11" fill="#6366f1" stroke="white" strokeWidth="1" /></svg>
                        <span style={{ background: '#6366f1', color: 'white', fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap', position: 'absolute', left: '12px', top: '10px' }}>{username}</span>
                    </div>
                ))}
            </div>

            {/* Export button per page (appears on hover) */}
            <button onClick={exportPNG}
                title={`Export page ${index + 1} as PNG`}
                style={{ position: 'absolute', bottom: '8px', right: '8px', zIndex: 15, background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
                onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0'}
            >
                <Download size={11} /> PNG
            </button>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   Main Canvas component – manages the multi-page scrolling doc
══════════════════════════════════════════════════════════════════════════ */
const Canvas = ({
    socket, roomId,
    pages: pagesFromParent,
    onPageElementsChange,
    onAddPage,
    canDraw = true
}) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';

    const scrollRef = useRef(null);
    const [zoom, setZoom] = useState(1.0);
    const [tool, setTool] = useState('pencil');
    const [color, setColor] = useState('#2563eb');
    const [size, setSize] = useState(4);
    const [bg, setBg] = useState('blank');
    const [stickyColor, setStickyColor] = useState('#fef08a');
    const [autoShape, setAutoShape] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [shapeMenu, setShapeMenu] = useState(false);
    const [bgMenu, setBgMenu] = useState(false);
    const [cursors, setCursors] = useState({});
    const [activePageId, setActivePageId] = useState(pagesFromParent[0]?.pageId || 'page-1');
    const [currentPageNum, setCurrentPageNum] = useState(1);

    // Overlays per page: { [pageId]: [...overlays] }
    const [overlaysMap, setOverlaysMap] = useState({});
    const [liveElements, setLiveElements] = useState({});

    const setOverlaysForPage = useCallback((pageId, updater) => {
        setOverlaysMap(prev => ({ ...prev, [pageId]: typeof updater === 'function' ? updater(prev[pageId] || []) : updater }));
    }, []);

    /* ── Socket listeners ─────────────────────────────────────────── */
    useEffect(() => {
        if (!socket) return;
        socket.on('cursor-move', ({ userId, username, x, y, pageId }) => {
            setCursors(prev => ({ ...prev, [userId]: { username, x, y, pageId } }));
        });
        socket.on('live-draw', ({ pageId, element }) => {
            setLiveElements(prev => ({ ...prev, [element.id]: { pageId, ...element } }));
        });
        socket.on('page-updated', ({ pageId, elements }) => {
            const syncedIds = new Set(elements.map(e => e.id));
            setLiveElements(prev => {
                let changed = false;
                const next = { ...prev };
                for (const id in next) {
                    if (syncedIds.has(Number(id))) {
                        delete next[id];
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        });
        return () => { socket.off('cursor-move'); socket.off('live-draw'); socket.off('page-updated'); };
    }, [socket]);

    /* ── Scroll: detect current page + auto-add at bottom ─────────── */
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Determine current visible page
            const pageH = A4_H * zoom + PAGE_GAP;
            const pageNum = Math.floor(scrollTop / pageH) + 1;
            setCurrentPageNum(Math.min(pageNum, pagesFromParent.length));
            if (pagesFromParent[pageNum - 1]) setActivePageId(pagesFromParent[pageNum - 1].pageId);

            // Auto-add page near bottom
            if (scrollHeight - scrollTop - clientHeight < A4_H * zoom * 0.5) {
                onAddPage?.();
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [pagesFromParent, zoom, onAddPage]);

    /* ── Zoom step helpers ─────────────────────────────────────────────── */
    const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const zoomIn = () => {
        const next = ZOOM_STEPS.find(z => z > zoom);
        setZoom(next ?? 2.0);
    };
    const zoomOut = () => {
        const prev = [...ZOOM_STEPS].reverse().find(z => z < zoom);
        setZoom(prev ?? 0.5);
    };
    const zoomReset = () => setZoom(1.0);

    /* ── Focus mode key ───────────────────────────────────────────── */
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape' && focusMode) setFocusMode(false); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [focusMode]);

    /* ── Scroll to page ───────────────────────────────────────────── */
    const scrollToPage = (idx) => {
        const container = scrollRef.current;
        if (!container) return;
        const pageH = A4_H * zoom + PAGE_GAP;
        container.scrollTo({ top: idx * pageH, behavior: 'smooth' });
    };

    /* ── Export all pages as PDF (print dialog) ────────────────────── */
    const exportPDF = () => window.print();

    /* ── Export single page as PNG helper ─────────────────────────── */
    const exportPagePNG = (bgCanvas, drawCanvas, pageIdx) => {
        const out = document.createElement('canvas');
        out.width = A4_W; out.height = A4_H;
        const ctx = out.getContext('2d');
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.drawImage(drawCanvas, 0, 0);
        const link = document.createElement('a');
        link.download = `page-${pageIdx + 1}.png`;
        link.href = out.toDataURL('image/png');
        link.click();
    };

    /* ── Theme colors ─────────────────────────────────────────────── */
    const tbBg = dark ? 'rgba(17,17,17,0.7)' : 'rgba(255,255,255,0.85)';
    const tbBorder = dark ? 'rgba(255,255,255,0.08)' : '#e4e7ef';
    const tbText = dark ? '#a3a3a3' : '#4b5563';
    const canvasBg = dark ? '#0a0a0a' : '#e8eaf0';

    const activePageIdx = pagesFromParent.findIndex(p => p.pageId === activePageId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: canvasBg, overflow: 'hidden', position: 'relative' }}>

            {/* ── FLOATING TOOLBAR ──────────────────────────────────── */}
            {!focusMode && (
                <div style={{
                    position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 100, background: tbBg, border: `1px solid ${tbBorder}`,
                    borderRadius: '24px', boxShadow: dark ? '0 10px 40px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(24px)',
                    display: 'flex', alignItems: 'center', padding: '0 12px', gap: '4px', height: '48px',
                    userSelect: 'none'
                }}>
                    {/* Undo / Redo */}
                    <TGroup>
                        <TBtn dark={dark} title="Undo (Ctrl+Z)"><Undo2 size={14} /></TBtn>
                        <TBtn dark={dark} title="Redo (Ctrl+Y)"><Redo2 size={14} /></TBtn>
                    </TGroup>
                    <TDiv dark={dark} />

                    {/* Pens */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                        {PEN_COLORS.map(({ color: c, label }) => {
                            const isActive = tool === 'pencil' && color === c;
                            return (
                                <button key={c} title={label}
                                    onClick={() => { setTool('pencil'); setColor(c); }}
                                    style={{ width: '20px', height: '34px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', transform: isActive ? 'translateY(-4px)' : 'none', outline: isActive ? `2px solid ${c}88` : 'none', outlineOffset: '2px', borderRadius: '4px', transition: 'transform 0.12s ease' }}>
                                    <svg width="14" height="28" viewBox="0 0 18 34" fill="none">
                                        <rect x="5" y="1" width="8" height="22" rx="4" fill={c} />
                                        <rect x="6" y="3" width="3" height="16" rx="2" fill="rgba(255,255,255,0.28)" />
                                        <polygon points="5,23 13,23 9,31" fill={c} />
                                        <polygon points="8,27 10,27 9,30.5" fill="rgba(0,0,0,0.2)" />
                                    </svg>
                                </button>
                            );
                        })}
                        <TBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} dark={dark}><Eraser size={14} /><TLbl>Erase</TLbl></TBtn>
                    </div>

                    {/* Sizes */}
                    <TDiv dark={dark} />
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {PEN_SIZES.map(s => (
                            <button key={s} onClick={() => setSize(s)} title={`${s}px`}
                                style={{ width: '20px', height: '20px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: size === s ? (tool === 'pencil' ? color : '#555') : (dark ? '#2c2f4a' : '#f1f3f7'), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                                <div style={{ width: `${Math.min(s + 2, 12)}px`, height: `${Math.min(s + 2, 12)}px`, borderRadius: '50%', background: size === s ? 'white' : (dark ? '#475569' : '#aaa') }} />
                            </button>
                        ))}
                    </div>
                    <TDiv dark={dark} />

                    {/* Auto-Shape Wand */}
                    <TBtn active={autoShape} onClick={() => setAutoShape(a => !a)} dark={dark} title="Auto-Shape (Magic)"><Wand2 size={14} /><TLbl>Magic</TLbl></TBtn>
                    <TDiv dark={dark} />

                    {/* Shapes */}
                    <div style={{ position: 'relative' }}>
                        <TBtn onClick={() => { setShapeMenu(v => !v); setBgMenu(false); }} dark={dark}><Plus size={13} /><TLbl>Add</TLbl></TBtn>
                        {shapeMenu && (
                            <DropMenu dark={dark}>
                                {[['line', '╱ Line'], ['rect', '▭ Rect'], ['circle', '◯ Circle']].map(([t, lbl]) => (
                                    <DropItem key={t} active={tool === t} dark={dark} onClick={() => { setTool(t); setShapeMenu(false); }}>{lbl}</DropItem>
                                ))}
                            </DropMenu>
                        )}
                    </div>

                    {/* Hand */}
                    <TBtn active={tool === 'hand'} onClick={() => setTool('hand')} dark={dark}><Hand size={14} /><TLbl>Pan</TLbl></TBtn>

                    {/* Text */}
                    <TBtn active={tool === 'text'} onClick={() => setTool('text')} dark={dark}><Type size={14} /><TLbl>Text</TLbl></TBtn>

                    {/* Sticky */}
                    <div style={{ position: 'relative' }}>
                        <TBtn active={tool === 'sticky'} onClick={() => setTool('sticky')} dark={dark}>
                            <div style={{ width: '13px', height: '13px', background: stickyColor, border: '1.5px solid rgba(0,0,0,0.2)', borderRadius: '2px' }} /><TLbl>Note</TLbl>
                        </TBtn>
                        {tool === 'sticky' && (
                            <div style={{ position: 'absolute', top: '50px', left: 0, display: 'flex', gap: '4px', padding: '5px', background: tbBg, border: `1px solid ${tbBorder}`, borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 300 }}>
                                {STICKY_COLORS.map(c => (
                                    <button key={c} onClick={() => setStickyColor(c)} style={{ width: '18px', height: '18px', borderRadius: '4px', background: c, border: stickyColor === c ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Image */}
                    <TBtn active={tool === 'image'} onClick={() => setTool('image')} dark={dark}><ImageIcon size={14} /><TLbl>Image</TLbl></TBtn>

                    <TDiv dark={dark} />

                    {/* Background */}
                    <div style={{ position: 'relative' }}>
                        <TBtn onClick={() => { setBgMenu(v => !v); setShapeMenu(false); }} dark={dark}><span style={{ fontSize: '11px' }}>⬜</span><TLbl>BG</TLbl></TBtn>
                        {bgMenu && (
                            <DropMenu dark={dark}>
                                {BG_OPTIONS.map(opt => (
                                    <DropItem key={opt.id} active={bg === opt.id} dark={dark} onClick={() => { setBg(opt.id); setBgMenu(false); }}>{opt.label}</DropItem>
                                ))}
                            </DropMenu>
                        )}
                    </div>

                    <TDiv dark={dark} />

                    {/* Zoom */}
                    <TGroup>
                        <button onClick={zoomOut} style={zBtnStyle(dark)} title="Zoom out"><ZoomOut size={13} /></button>
                        <button onClick={zoomReset}
                            style={{ ...zBtnStyle(dark), fontSize: '0.68rem', fontWeight: '800', minWidth: '38px', padding: '0 4px' }}
                            title="Reset zoom">{Math.round(zoom * 100)}%</button>
                        <button onClick={zoomIn} style={zBtnStyle(dark)} title="Zoom in"><ZoomIn size={13} /></button>
                    </TGroup>

                    {/* Download All PDF */}
                    <TDiv dark={dark} />
                    <TBtn onClick={exportPDF} dark={dark} title="Download all pages as PDF">
                        <Download size={14} /><TLbl>PDF</TLbl>
                    </TBtn>

                    {/* Focus mode */}
                    <TDiv dark={dark} />
                    <TBtn onClick={() => setFocusMode(true)} dark={dark} title="Focus mode (Esc to exit)"><Focus size={14} /></TBtn>

                    {!canDraw && (
                        <div style={{ padding: '3px 10px', borderRadius: '999px', background: '#fef2f2', color: '#dc2626', fontSize: '0.68rem', fontWeight: '700', border: '1px solid #fecaca', whiteSpace: 'nowrap', marginLeft: '4px' }}>
                            🔒 View Only
                        </div>
                    )}
                </div>
            )}

            {/* ── FOCUS MODE EXIT HINT ───────────────────────────── */}
            {focusMode && (
                <div onClick={() => setFocusMode(false)} style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '5px 14px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '600', cursor: 'pointer', zIndex: 200 }}>
                    Focus Mode — click or press Esc to exit
                </div>
            )}

            {/* ── PAGE INDICATOR ────────────────────────────────── */}
            <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: dark ? 'rgba(10,10,10,0.6)' : 'rgba(255,255,255,0.8)', border: `1px solid ${tbBorder}`, borderRadius: '999px', padding: '5px 16px', fontSize: '0.72rem', fontWeight: '700', color: tbText, display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(16px)' }}>
                <FileText size={12} style={{ color: '#6366f1' }} />
                Page {currentPageNum} of {pagesFromParent.length}
                <button onClick={() => onAddPage?.()} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '999px', padding: '2px 8px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Plus size={10} /> Add
                </button>
            </div>

            {/* ── MINI PAGE NAVIGATOR (right side) ──────────────── */}
            <div style={{ position: 'absolute', right: '10px', top: '70px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {pagesFromParent.map((p, i) => (
                    <button key={p.pageId} onClick={() => scrollToPage(i)} title={p.name || `Page ${i + 1}`}
                        style={{ width: '28px', height: '38px', borderRadius: '5px', border: `1px solid ${activePageId === p.pageId ? '#6366f1' : tbBorder}`, background: activePageId === p.pageId ? (dark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : (dark ? 'rgba(255,255,255,0.02)' : 'white'), cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', transition: 'all 0.15s', backdropFilter: 'blur(8px)' }}>
                        <FileText size={10} style={{ color: activePageId === p.pageId ? '#6366f1' : (dark ? '#a3a3a3' : '#9ca3af') }} />
                        <span style={{ fontSize: '0.52rem', fontWeight: '700', color: activePageId === p.pageId ? '#6366f1' : (dark ? '#a3a3a3' : '#9ca3af') }}>{i + 1}</span>
                    </button>
                ))}
                <button onClick={() => onAddPage?.()} title="Add new page"
                    style={{ width: '28px', height: '24px', borderRadius: '5px', border: `1.5px dashed ${dark ? '#4f46e5' : '#a5b4fc'}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', transition: 'all 0.15s' }}>
                    <Plus size={12} />
                </button>
            </div>

            {/* ── SCROLLABLE DOCUMENT AREA ───────────────────────── */}
            <div ref={scrollRef}
                style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${72 + 16}px ${PAGE_MARGIN}px 60px` }}>

                <AnimatePresence>
                    {pagesFromParent.map((page, idx) => (
                        <motion.div key={page.pageId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            style={{ marginBottom: `${PAGE_GAP}px`, position: 'relative', flexShrink: 0 }}
                        >
                            {/* Page label above sheet */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px', opacity: 0.8 }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: dark ? '#a3a3a3' : '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {page.name || `Page ${idx + 1}`}
                                </span>
                                <span style={{ fontSize: '0.62rem', color: dark ? '#525252' : '#cbd5e1' }}>A4</span>
                            </div>

                            {/* Page shadow wrapper */}
                            <div style={{
                                boxShadow: dark
                                    ? '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)'
                                    : '0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)',
                                borderRadius: '4px',
                                width: A4_W * zoom,
                                height: A4_H * zoom,
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <SinglePage
                                    page={page}
                                    index={idx}
                                    darkMode={dark}
                                    bgStyle={bg}
                                    zoom={zoom}
                                    autoShape={autoShape}
                                    activeTool={tool}
                                    activeColor={color}
                                    activeSize={size}
                                    activeStickyColor={stickyColor}
                                    canDraw={canDraw}
                                    socket={socket}
                                    roomId={roomId}
                                    onElementsChange={onPageElementsChange}
                                    cursors={cursors}
                                    isActivePage={activePageId === page.pageId}
                                    setActivePage={setActivePageId}
                                    overlaysForPage={overlaysMap[page.pageId] || []}
                                    setOverlaysForPage={(updater) => setOverlaysForPage(page.pageId, updater)}
                                    liveElements={Object.values(liveElements).filter(e => e.pageId === page.pageId)}
                                />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

/* ── Toolbar micro-components ─────────────────────────────────────────────── */
const TBtn = ({ children, active, onClick, title, dark, style }) => (
    <button onClick={onClick} title={title}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '4px 6px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: active ? 'rgba(99,102,241,0.15)' : 'transparent', color: active ? '#6366f1' : (dark ? '#a3a3a3' : '#4b5563'), transition: 'all 0.12s', minWidth: '34px', ...style }}
        onMouseOver={e => { if (!active) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f1f3f7'; }}
        onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >{children}</button>
);
const TLbl = ({ children }) => <span style={{ fontSize: '0.52rem', fontWeight: '700', color: 'inherit', whiteSpace: 'nowrap' }}>{children}</span>;
const TGroup = ({ children }) => <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>{children}</div>;
const TDiv = ({ dark }) => <div style={{ width: '1px', height: '22px', background: dark ? 'rgba(255,255,255,0.08)' : '#e4e7ef', margin: '0 4px', flexShrink: 0 }} />;
const DropMenu = ({ children, dark }) => (
    <div style={{ position: 'absolute', top: '54px', left: 0, background: dark ? 'rgba(17,17,17,0.85)' : 'rgba(255,255,255,0.9)', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e4e7ef'}`, backdropFilter: 'blur(20px)', borderRadius: '12px', padding: '6px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', zIndex: 300, minWidth: '130px' }}>
        {children}
    </div>
);
const DropItem = ({ children, active, dark, onClick }) => (
    <button onClick={onClick} style={{ display: 'block', width: '100%', padding: '7px 10px', background: active ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: dark ? '#e2e8f0' : '#333' }}>
        {children}
    </button>
);
const zBtnStyle = (dark) => ({ width: '24px', height: '24px', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e4e7ef'}`, borderRadius: '6px', background: dark ? 'rgba(255,255,255,0.03)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? '#a3a3a3' : '#4b5563', transition: 'background 0.2s' });

export default Canvas;
