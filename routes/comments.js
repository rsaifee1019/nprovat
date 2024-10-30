const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Article = require('../models/Article');
const auth = require('../api/middleware/auth');
const { body, validationResult } = require('express-validator');

// GET comments for an article (top-level comments only)
router.get('/article/:articleId', async (req, res) => {
    try {
        const comments = await Comment.find({ article: req.params.articleId, parentComment: null })
            .populate('author', 'name')
            .sort('-createdAt');
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET a single comment with its nested replies
router.get('/:id', async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        const nestedComment = await comment.getNestedComments();
        res.json(nestedComment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST a new comment
router.post('/', auth, async (req, res) => {
    console.log('Received request body:', req.body);
    console.log('Authenticated user:', req.user);

    try {
        const { content, articleId, parentCommentId } = req.body;
        console.log('Extracted data:', { content, articleId, parentCommentId });

        const comment = new Comment({
            content,
            author: req.user.id,
            article: articleId,
            parentComment: parentCommentId
        });
        console.log('Created comment object:', comment);

        const savedComment = await comment.save();
        console.log('Saved comment:', savedComment);

        await savedComment.populate('author', 'name');
        console.log('Populated comment:', savedComment);

        res.status(201).json(savedComment);
    } catch (err) {
        console.error('Error in comment creation:', err);
        res.status(400).json({ message: err.message });
    }
});

// UPDATE a comment
router.put('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized' });
        }

        comment.content = req.body.content;
        comment.updatedAt = Date.now();

        const updatedComment = await comment.save();
        res.json(updatedComment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a comment
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized' });
        }

        // Remove this comment from its parent's replies array
        if (comment.parentComment) {
            await Comment.findByIdAndUpdate(comment.parentComment, {
                $pull: { replies: comment._id }
            });
        }

        // Recursively delete all nested replies
        const deleteReplies = async (commentId) => {
            const replies = await Comment.find({ parentComment: commentId });
            for (let reply of replies) {
                await deleteReplies(reply._id);
                await reply.remove();
            }
        };

        await deleteReplies(comment._id);
        await comment.remove();

        res.json({ message: 'Comment and all nested replies removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
