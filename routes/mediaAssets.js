const express = require('express');
const router = express.Router();
const MediaAsset = require('../models/MediaAsset');

// GET all media assets
router.get('/', async (req, res) => {
    try {
        const mediaAssets = await MediaAsset.find();
        res.json(mediaAssets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET a single media asset
router.get('/:id', getMediaAsset, (req, res) => {
    res.json(res.mediaAsset);
});

// POST a new media asset
router.post('/', async (req, res) => {
    const mediaAsset = new MediaAsset({
        title: req.body.title,
        type: req.body.type,
        url: req.body.url,
        description: req.body.description
    });

    try {
        const newMediaAsset = await mediaAsset.save();
        res.status(201).json(newMediaAsset);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE a media asset
router.patch('/:id', getMediaAsset, async (req, res) => {
    if (req.body.title != null) {
        res.mediaAsset.title = req.body.title;
    }
    if (req.body.type != null) {
        res.mediaAsset.type = req.body.type;
    }
    if (req.body.url != null) {
        res.mediaAsset.url = req.body.url;
    }
    if (req.body.description != null) {
        res.mediaAsset.description = req.body.description;
    }

    try {
        const updatedMediaAsset = await res.mediaAsset.save();
        res.json(updatedMediaAsset);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a media asset
router.delete('/:id', getMediaAsset, async (req, res) => {
    try {
        await res.mediaAsset.remove();
        res.json({ message: 'Media asset deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Middleware function to get media asset by ID
async function getMediaAsset(req, res, next) {
    let mediaAsset;
    try {
        mediaAsset = await MediaAsset.findById(req.params.id);
        if (mediaAsset == null) {
            return res.status(404).json({ message: 'Cannot find media asset' });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.mediaAsset = mediaAsset;
    next();
}

module.exports = router;
