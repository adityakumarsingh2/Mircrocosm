const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    pageId: { type: String, required: true },
    name: { type: String, default: '' },
    elements: { type: Array, default: [] }
}, { _id: false });

const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    name: { type: String },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hostUsername: { type: String }, // username of the board creator
    pages: { type: [pageSchema], default: [] },
    // Legacy field kept for migration
    elements: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
