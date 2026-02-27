const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// GET /api/rooms - Fetch all rooms (for now, public/simple list)
router.get('/', async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 }).limit(20);
        res.json(rooms);
    } catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// GET /api/rooms/:roomId - Check if room exists
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        res.json(room);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
