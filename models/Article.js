const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        
    },
    publishDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        
    },
   

    featuredImage: String,
    views: {
        type: Number,
        default: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    trendingScore: {
        type: Number,
        default: 0
    }
});

// Add this after your schema definition
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Article', articleSchema);
