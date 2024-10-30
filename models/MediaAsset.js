const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['image', 'video', 'audio', 'document']
    },
    url: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    associatedArticle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        size: Number,
        format: String,
        duration: Number // for audio/video
    }
});

// Update the 'updatedAt' field before saving
mediaAssetSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});



module.exports = mongoose.model('MediaAsset', mediaAssetSchema);
