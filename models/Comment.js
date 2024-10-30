const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add a method to the schema to get nested comments
commentSchema.methods.getNestedComments = async function() {
    const populateReplies = async (comment) => {
        await comment.populate('replies').execPopulate();
        for (let reply of comment.replies) {
            await populateReplies(reply);
        }
    };
    await populateReplies(this);
    return this;
};

module.exports = mongoose.model('Comment', commentSchema);
