const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.natunprovat.com', 'https://natunprovat.com'],
  credentials: true
}));

// Import routes
const articleRoutes = require('./routes/articles');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const mediaAssetRoutes = require('./routes/mediaAssets');
const authRoutes = require('./routes/auth');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    ssl: true,
    tlsAllowInvalidCertificates: true,
    serverSelectionTimeoutMS: 30000, 
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/media-assets', mediaAssetRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../public_html')));

// For any request that doesn't match an API route, send the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public_html', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
