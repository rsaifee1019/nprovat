const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const { verifyToken, auth } = require('../middleware/auth');

// Connect to MongoDB
const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

module.exports = async (req, res) => {
  await connectToDatabase();

  const { method, query, body } = req;

  switch (method) {
    case 'GET':
      if (req.url.startsWith('/api/comments/article/')) {
        return getCommentsForArticle(req, res);
      } else {
        return getCommentById(req, res);
      }
    case 'POST':
      return auth(req, res, () => createComment(req, res));
    case 'PUT':
      return auth(req, res, () => updateComment(req, res));
    case 'DELETE':
      return auth(req, res, () => deleteComment(req, res));
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};

const getCommentsForArticle = async (req, res) => {
  try {
    const comments = await Comment.find({ article: req.query.articleId, parentComment: null })
      .populate('author', 'name')
      .sort('-createdAt');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCommentById = async (req, res) => {
  try {
    const comment = await Comment.findById(req.query.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    const nestedComment = await comment.getNestedComments();
    res.json(nestedComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createComment = async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { content, articleId, parentCommentId } = req.body;

    const comment = new Comment({
      content,
      author: user._id,
      article: articleId,
      parentComment: parentCommentId,
    });

    const savedComment = await comment.save();
    await savedComment.populate('author', 'name');

    res.status(201).json(savedComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateComment = async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const comment = await Comment.findById(req.query.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== user._id) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    comment.content = req.body.content;
    comment.updatedAt = Date.now();

    const updatedComment = await comment.save();
    res.json(updatedComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const comment = await Comment.findById(req.query.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== user._id) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id },
      });
    }

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
};