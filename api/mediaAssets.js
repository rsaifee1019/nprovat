const mongoose = require('mongoose');
const MediaAsset = require('../models/MediaAsset');
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
      if (req.url.startsWith('/api/mediaAssets/')) {
        return getMediaAssetById(req, res);
      } else {
        return getAllMediaAssets(req, res);
      }
    case 'POST':
      return auth(req, res, () => createMediaAsset(req, res));
    case 'PATCH':
      return auth(req, res, () => updateMediaAsset(req, res));
    case 'DELETE':
      return auth(req, res, () => deleteMediaAsset(req, res));
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};

const getAllMediaAssets = async (req, res) => {
  try {
    const mediaAssets = await MediaAsset.find();
    res.json(mediaAssets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMediaAssetById = async (req, res) => {
  try {
    const mediaAsset = await MediaAsset.findById(req.query.id);
    if (!mediaAsset) {
      return res.status(404).json({ message: 'Cannot find media asset' });
    }
    res.json(mediaAsset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMediaAsset = async (req, res) => {
  const mediaAsset = new MediaAsset({
    title: req.body.title,
    type: req.body.type,
    url: req.body.url,
    description: req.body.description,
  });

  try {
    const newMediaAsset = await mediaAsset.save();
    res.status(201).json(newMediaAsset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateMediaAsset = async (req, res) => {
  try {
    const mediaAsset = await MediaAsset.findById(req.query.id);
    if (!mediaAsset) {
      return res.status(404).json({ message: 'Cannot find media asset' });
    }

    if (req.body.title != null) {
      mediaAsset.title = req.body.title;
    }
    if (req.body.type != null) {
      mediaAsset.type = req.body.type;
    }
    if (req.body.url != null) {
      mediaAsset.url = req.body.url;
    }
    if (req.body.description != null) {
      mediaAsset.description = req.body.description;
    }

    const updatedMediaAsset = await mediaAsset.save();
    res.json(updatedMediaAsset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteMediaAsset = async (req, res) => {
  try {
    const mediaAsset = await MediaAsset.findById(req.query.id);
    if (!mediaAsset) {
      return res.status(404).json({ message: 'Cannot find media asset' });
    }

    await mediaAsset.remove();
    res.json({ message: 'Media asset deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};