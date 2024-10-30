const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST route to create multiple articles with images
router.post('/bulk-with-images',  upload.array('featuredImages'), async (req, res) => {
  try {


    let articles;
    if (typeof req.body.articles === 'string') {
      articles = JSON.parse(req.body.articles);
    } else if (Array.isArray(req.body.articles)) {
      articles = req.body.articles;
    } else {
      throw new Error('Invalid articles data');
    }

    const createdArticles = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const featuredImageUrl = req.files[i] ? `${process.env.BACKEND_URL}/uploads/${req.files[i].filename}` : null;

      const newArticle = new Article({
        title: article.title,
        content: article.content,
        category: article.category,
        featuredImage: featuredImageUrl,
        status: 'DRAFT'
      });

      await newArticle.save();
      createdArticles.push(newArticle);
    }

    res.status(201).json({ message: 'Articles created successfully', count: createdArticles.length, articles: createdArticles });
  } catch (error) {
    console.error('Error creating articles:', error);
    res.status(500).json({ message: 'Error creating articles', error: error.message });
  }
});

// GET all articles with pagination, sorting, filtering, and search
router.get('/', async (req, res) => {
    console.log('GET /api/articles route hit'); // Log when the route is hit
    try {
        const { page = 1, limit = 10, sort = '-publishDate', category, startDate, endDate } = req.query;
        const query = {};
        
        if (category) query.category = category;
        
        if (startDate || endDate) {
            query.publishDate = {};
            if (startDate) query.publishDate.$gte = new Date(startDate);
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                query.publishDate.$lte = endOfDay;
            }
        }

        const articles = await Article.find(query)
            .sort(sort)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .populate('author', 'name');

        const total = await Article.countDocuments(query);

        console.log('Articles fetched successfully:', articles.length); // Log the number of articles fetched

        res.json({
            articles,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            totalArticles: total
        });
    } catch (err) {
        console.error('Error in GET /articles:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get articles by category
router.get('/', async (req, res) => {
  console.log('GET /api/articles by category route hit'); // Log when the route is hit
  const { category, page = 1, limit = 10 } = req.query;
  const query = category ? { category } : {};

  try {
      const articles = await Article.find(query)
          .limit(limit * 1)
          .skip((page - 1) * limit)
          .exec();

      const count = await Article.countDocuments(query);

      console.log('Articles by category fetched successfully:', articles.length); // Log the number of articles fetched

      res.json({
          articles,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
      });
  } catch (err) {
      console.error('Error in GET /articles by category:', err);
      res.status(500).json({ message: err.message });
  }
});

// Search articles
router.get('/search', async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
  
      const articles = await Article.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
  
      res.json(articles);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

// POST a new article
router.post('/',  upload.single('featuredImage'), async (req, res) => {
   
    try {
      const {
        title,
        content,
        category
      } = req.body;
  
      
      // Create a new article
      const newArticle = new Article({
        title,
        content,
        category,
        featuredImage: req.file ? `${process.env.BACKEND_URL}/uploads/${req.file.filename}` : null,
        status: 'DRAFT'
      });

      // Save the article to the database
      await newArticle.save();

    
      res.status(201).json({ message: 'Article created successfully', article: newArticle });
    } catch (error) {
      console.error('Error creating article:', error);
      res.status(500).json({ message: 'Error creating article', error: error.message });
    }
  });



  // POST route to create multiple articles
router.post('/bulk', async (req, res) => {
    try {
      const articles = req.body;
      const createdArticles = await Article.insertMany(articles.map(article => ({
        ...article,
        status: 'DRAFT',
        tags: article.tags ? article.tags.split(',').map(tag => tag.trim()) : [],
      })));
  
      res.status(201).json({ message: 'Articles created successfully', count: createdArticles.length });
    } catch (error) {
      console.error('Error creating articles:', error);
      res.status(500).json({ message: 'Error creating articles', error: error.message });
    }
  });

// GET featured articles (move this route up)
router.get('/featured', async (req, res) => {
    try {
        const { page = 1, limit = 5 } = req.query;
        const featuredArticles = await Article.find({ isFeatured: true })
            .sort('-publishDate')
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .populate('author', 'name');

        const total = await Article.countDocuments({ isFeatured: true });

        res.json({
            articles: featuredArticles,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            totalArticles: total
        });
    } catch (err) {
        console.error('Error fetching featured articles:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET trending articles (keep this here too)
router.get('/trending', async (req, res) => {
    try {
        const trendingArticles = await Article.find()
            .sort('-trendingScore -publishDate')
            .limit(10)
            .populate('author', 'name');
        res.json(trendingArticles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET a specific article (move this route down)
router.get('/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id).populate('author', 'name');
        if (!article) return res.status(404).json({ message: 'Article not found' });
        
        // Increment views
        article.views += 1;
        await article.save();

        res.json(article);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE an article
router.put('/:id', upload.single('featuredImage'), async (req, res) => {
  console.log(`PUT /api/articles/${req.params.id} route hit`);
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      console.log(`Article with id ${req.params.id} not found`);
      return res.status(404).json({ message: 'Article not found' });
    }
    
    const updateData = {
      title: req.body.title,
      content: req.body.content,
      category: req.body.category,
      lastUpdated: Date.now()
    };

    if (req.file) {
      updateData.featuredImage = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
      
      // Delete the old image if it exists
      if (article.featuredImage) {
        const oldImagePath = article.featuredImage.replace(`${process.env.BACKEND_URL}/uploads/`, '');
        const fullPath = path.join(__dirname, '..', 'uploads', oldImagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }

    console.log('Updating article with data:', updateData);
    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    console.log('Updated article:', updatedArticle);
    res.json(updatedArticle);
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE an article
router.delete('/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        
        // Check if the user object exists and has necessary properties
      

        // Check if the user is the author of the article
       
        // Check if the user is an admin (if role exists)
       

        // Delete associated images
        if (article.images && article.images.length > 0) {
            article.images.forEach(imagePath => {
                const fullPath = path.join(__dirname, '..', imagePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (unlinkError) {
                        console.error('Error deleting image file:', unlinkError);
                        // Continue with deletion even if image removal fails
                    }
                }
            });
        }

        // Remove the article from the database
        await Article.findByIdAndDelete(req.params.id);

        res.json({ message: 'Article removed successfully' });
    } catch (err) {
        console.error('Error deleting article:', err);
        res.status(500).json({ message: 'Error deleting article', error: err.message });
    }
});

// UPDATE article's featured status (admin only)
router.patch('/:id/featured', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        article.isFeatured = req.body.isFeatured;
        await article.save();

        res.json(article);
    } catch (err) {
        console.error('Error updating featured status:', err);
        res.status(500).json({ message: 'Error updating featured status' });
    }
});

module.exports = router;
