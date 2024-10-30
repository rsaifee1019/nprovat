const mongoose = require('mongoose');
const Article = require('../models/Article');
const { verifyToken, auth } = require('../middleware/auth');
const {roleAuth} = require('../middleware/roleAuth');

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
      if (req.url.startsWith('/api/articles/featured')) {
        return getFeaturedArticles(req, res);
      } else if (req.url.startsWith('/api/articles/trending')) {
        return getTrendingArticles(req, res);
      } else if (req.url.startsWith('/api/articles/')) {
        return getArticleById(req, res);
      } else {
        return getAllArticles(req, res);
      }
    case 'POST':
      if (req.url.startsWith('/api/articles/bulk')) {
        return auth(req, res, () => createBulkArticles(req, res));
      } else {
        return auth(req, res, () => createArticle(req, res));
      }
    case 'PUT':
      return auth(req, res, () => updateArticle(req, res));
    case 'DELETE':
      return auth(req, res, () => deleteArticle(req, res));
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};

const getAllArticles = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-publishDate', category, tag, search } = req.query;
    const query = {};
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) query.$text = { $search: search };

    const articles = await Article.find(query)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('author', 'name');

    const total = await Article.countDocuments(query);

    res.json({
      articles,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.query.id).populate('author', 'name');
    if (!article) return res.status(404).json({ message: 'Article not found' });

    article.views += 1;
    await article.save();

    res.json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createArticle = async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { title, content, category, tags, type, featuredImage, isFeatured } = req.body;

    const newArticle = new Article({
      title,
      content,
      category,
      tags: tags.split(',').map(tag => tag.trim()),
      type,
      featuredImage,
      isFeatured: isFeatured || false,
      author: user._id,
      status: 'DRAFT',
    });

    await newArticle.save();

    res.status(201).json({ message: 'Article created successfully', article: newArticle });
  } catch (error) {
    res.status(500).json({ message: 'Error creating article', error: error.message });
  }
};

const createBulkArticles = async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const articles = req.body;
    const createdArticles = await Article.insertMany(
      articles.map(article => ({
        ...article,
        author: user._id,
        status: 'DRAFT',
        tags: article.tags ? article.tags.split(',').map(tag => tag.trim()) : [],
      }))
    );

    res.status(201).json({ message: 'Articles created successfully', count: createdArticles.length });
  } catch (error) {
    res.status(500).json({ message: 'Error creating articles', error: error.message });
  }
};

const updateArticle = async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const article = await Article.findById(req.query.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    if (article.author.toString() !== user._id) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      req.query.id,
      { ...req.body, lastUpdated: Date.now() },
      { new: true }
    );
    res.json(updatedArticle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteArticle = async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const article = await Article.findById(req.query.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    if (article.author.toString() !== user._id) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    await article.remove();
    res.json({ message: 'Article removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFeaturedArticles = async (req, res) => {
  try {
    const featuredArticles = await Article.find({ isFeatured: true })
      .sort('-publishDate')
      .limit(5)
      .populate('author', 'name');
    res.json(featuredArticles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTrendingArticles = async (req, res) => {
  try {
    const trendingArticles = await Article.find()
      .sort('-trendingScore -publishDate')
      .limit(10)
      .populate('author', 'name');
    res.json(trendingArticles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


