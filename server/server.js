const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const Room = require('./models/Room');
const User = require('./models/User');
require('dotenv').config();
require('./passport');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') callback(null, true);
            else callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') callback(null, true);
        else callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,
    name: 'collabpaint.sid',
    proxy: true, // Required for secure cookies behind proxy (Render/Vercel)
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true
    }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/roomRoutes'));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/whiteboard-collab";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- In-Memory Room State ---
// roomId -> { users: Map(socketId -> { username, isHost }), hostSocketId }
const roomState = new Map();

function getRoomState(roomId) {
    if (!roomState.has(roomId)) {
        roomState.set(roomId, { users: new Map(), hostSocketId: null });
    }
    return roomState.get(roomId);
}

// Helper to broadcast user list
function broadcastUserList(roomId) {
    const state = getRoomState(roomId);
    const userList = Array.from(state.users.values());
    io.to(roomId).emit('user-list', userList);
}

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    // ─── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId, username }) => {
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = username || `User-${socket.id.substring(0, 4)}`;

        const state = getRoomState(roomId);

        // Send existing board state (pages) and determine host from DB
        try {
            let roomData = await Room.findOne({ roomId });

            if (!roomData) {
                // First person to create the room → they are the host, persisted in DB
                roomData = await Room.create({
                    roomId,
                    hostUsername: socket.username,
                    pages: [{ pageId: 'page-1', name: 'New Page', elements: [] }]
                });
            } else if (roomData.pages.length === 0) {
                // Migrate legacy elements
                await Room.findOneAndUpdate({ roomId }, {
                    pages: [{ pageId: 'page-1', name: 'Page 1', elements: roomData.elements || [] }]
                });
                roomData = await Room.findOne({ roomId });
            }

            // Host = the user whose username matches the persisted hostUsername
            // Fallback: if hostUsername was never set (old rooms), first in-memory joiner is host
            const isHost = roomData.hostUsername
                ? socket.username === roomData.hostUsername
                : state.users.size === 0;

            // If this is an old room with no hostUsername yet, persist it now
            if (!roomData.hostUsername && state.users.size === 0) {
                await Room.findOneAndUpdate({ roomId }, { $set: { hostUsername: socket.username } });
            }

            if (isHost) state.hostSocketId = socket.id;

            state.users.set(socket.id, { socketId: socket.id, username: socket.username, isHost, isMuted: false, cameraOn: false });
            broadcastUserList(roomId);

            socket.emit('init-board', { pages: roomData.pages, isHost, roomName: roomData.name || '' });
        } catch (err) {
            console.error('Error initializing board:', err);
            // Fallback: add user without host
            state.users.set(socket.id, { socketId: socket.id, username: socket.username, isHost: false, isMuted: false, cameraOn: false });
            broadcastUserList(roomId);
        }

        // Notify existing peers about new peer (WebRTC)
        socket.to(roomId).emit('peer-joined', { peerId: socket.id, username: socket.username });
        console.log(`${socket.username} joined room ${roomId}`);
    });

    // ─── PAGE MANAGEMENT ─────────────────────────────────────────────────────
    socket.on('add-page', async ({ roomId, page }) => {
        try {
            await Room.findOneAndUpdate({ roomId }, { $push: { pages: page } });
            io.to(roomId).emit('page-added', page);
        } catch (err) {
            console.error('Error adding page:', err);
        }
    });

    socket.on('update-page', async ({ roomId, pageId, elements }) => {
        socket.to(roomId).emit('page-updated', { pageId, elements });
        try {
            await Room.findOneAndUpdate(
                { roomId, 'pages.pageId': pageId },
                { $set: { 'pages.$.elements': elements } }
            );
        } catch (err) {
            console.error('Error updating page:', err);
        }
    });

    socket.on('rename-page', async ({ roomId, pageId, name }) => {
        socket.to(roomId).emit('page-renamed', { pageId, name });
        try {
            await Room.findOneAndUpdate(
                { roomId, 'pages.pageId': pageId },
                { $set: { 'pages.$.name': name } }
            );
        } catch (err) {
            console.error('Error renaming page:', err);
        }
    });

    socket.on('delete-page', async ({ roomId, pageId }) => {
        socket.to(roomId).emit('page-deleted', { pageId });
        try {
            await Room.findOneAndUpdate({ roomId }, { $pull: { pages: { pageId } } });
        } catch (err) {
            console.error('Error deleting page:', err);
        }
    });

    // ─── RENAME ROOM ──────────────────────────────────────────────────────────
    socket.on('rename-room', async ({ roomId, name }) => {
        try {
            await Room.findOneAndUpdate({ roomId }, { $set: { name } });
            io.to(roomId).emit('room-name-changed', { name });
        } catch (err) {
            console.error('Error renaming room:', err);
        }
    });

    // ─── CURSOR / LASER / REACTION / CHAT ────────────────────────────────────
    socket.on('cursor-move', (data) => {
        socket.to(data.roomId).emit('cursor-move', { ...data, userId: socket.id, username: socket.username });
    });

    socket.on('live-draw', (data) => {
        socket.to(data.roomId).emit('live-draw', data);
    });

    socket.on('laser-draw', (data) => {
        io.to(data.roomId).emit('laser-draw', data);
    });

    socket.on('reaction', (data) => {
        io.to(data.roomId).emit('reaction', data);
    });

    socket.on('chat-message', (data) => {
        io.to(data.roomId).emit('chat-message', { ...data, user: socket.username });
    });

    // ─── HOST CONTROLS ───────────────────────────────────────────────────────
    socket.on('mute-all', ({ roomId }) => {
        const state = getRoomState(roomId);
        if (state.hostSocketId === socket.id) {
            socket.to(roomId).emit('force-muted');
        }
    });

    socket.on('toggle-draw-lock', ({ roomId, locked }) => {
        const state = getRoomState(roomId);
        if (state.hostSocketId === socket.id) {
            socket.to(roomId).emit('draw-lock-changed', { locked });
        }
    });

    // ─── MEDIA STATE (mic / camera on/off) ──────────────────────────────────
    socket.on('media-state-changed', ({ roomId, micOn, camOn }) => {
        const state = getRoomState(roomId);
        const user = state.users.get(socket.id);
        if (user) {
            user.micOn = micOn;
            user.cameraOn = camOn;
        }
        broadcastUserList(roomId); // let everyone see updated mic/cam state
    });

    // ─── WebRTC SIGNALING ────────────────────────────────────────────────────
    socket.on('webrtc-offer', ({ targetId, offer, roomId }) => {
        io.to(targetId).emit('webrtc-offer', { from: socket.id, offer, username: socket.username });
    });

    socket.on('webrtc-answer', ({ targetId, answer }) => {
        io.to(targetId).emit('webrtc-answer', { from: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => {
        io.to(targetId).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    // ─── SCREEN SHARE BROADCAST ──────────────────────────────────────────────
    socket.on('screen-share-started', ({ roomId }) => {
        // Update room state
        const state = getRoomState(roomId);
        state.screenSharerSocketId = socket.id;
        // Broadcast to everyone else in the room
        socket.to(roomId).emit('screen-share-started', { peerId: socket.id, username: socket.username });
    });

    socket.on('screen-share-stopped', ({ roomId }) => {
        const state = getRoomState(roomId);
        if (state.screenSharerSocketId === socket.id) {
            state.screenSharerSocketId = null;
        }
        socket.to(roomId).emit('screen-share-stopped', { peerId: socket.id });
    });

    // ─── DISCONNECT ──────────────────────────────────────────────────────────
    socket.on('disconnecting', () => {
        for (const roomId of socket.rooms) {
            if (roomId === socket.id) continue;
            const state = getRoomState(roomId);
            state.users.delete(socket.id);
            // Host is now persisted in DB by hostUsername — no auto-promotion needed.
            // The original creator will get host status back when they reconnect.
            if (state.hostSocketId === socket.id) {
                state.hostSocketId = null;
            }
            broadcastUserList(roomId);
            io.to(roomId).emit('peer-left', { peerId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected:', socket.id);
    });
});

// ─── FRONTEND SERVING ────────────────────────────────────────────────
// In a monolith deployment (backend + frontend on same service), serve the client.
// When deployed separately (Vercel client + Render backend), the backend is API-only.
const fs = require('fs');
const clientDistPath = path.join(__dirname, '../client/dist');
const isMonolithDeployment = fs.existsSync(clientDistPath);

if (isMonolithDeployment) {
    // Monolith: serve the built client
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
            res.sendFile(path.resolve(clientDistPath, 'index.html'));
        }
    });
} else {
    // Separate deployment (Render API + Vercel client): health check only
    app.get('/', (req, res) => res.status(200).json({ message: 'Whiteboard Server is Running' }));
    app.get('/health', (req, res) => res.status(200).json({ ok: true }));
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
