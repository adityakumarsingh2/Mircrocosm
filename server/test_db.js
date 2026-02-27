const mongoose = require('mongoose');
const MONGO_URI = "mongodb://localhost:27017/whiteboard-collab";

console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connection Successful');
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB Connection Failed:', err.message);
        process.exit(1);
    });
