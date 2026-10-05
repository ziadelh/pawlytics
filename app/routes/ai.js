// AI Model Integration Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const upload = multer({ 
  dest: 'public/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed'), false);
    }
  }
});

// Flask AI service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5002';

router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`);
    res.json({
      status: 'connected',
      ai_service: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: 'AI service unavailable',
      message: error.message
    });
  }
});

// Analyze text symptoms
router.post('/analyze/text', async (req, res) => {
  try {
    const { symptom_text, breed, age, sex } = req.body;
    
    if (!symptom_text) {
      return res.status(400).json({
        error: 'symptom_text is required'
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/analyze/text`, {
      symptom_text,
      breed,
      age: age ? parseInt(age) : undefined,
      sex
    });

    res.json(response.data);
  } catch (error) {
    console.error('Text analysis error:', error.message);
    res.status(500).json({
      error: 'Text analysis failed',
      message: error.message
    });
  }
});

// Analyze audio file
router.post('/analyze/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided'
      });
    }

    const FormData = require('form-data');
    const fs = require('fs');
    
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(req.file.path));

    const response = await axios.post(`${AI_SERVICE_URL}/analyze/audio`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    res.json(response.data);
  } catch (error) {
    console.error('Audio analysis error:', error.message);
    
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
    
    res.status(500).json({
      error: 'Audio analysis failed',
      message: error.message
    });
  }
});

// Analyze image file
router.post('/analyze/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    const FormData = require('form-data');
    const fs = require('fs');
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));
    formData.append('symptoms', req.body.symptoms || '');

    const response = await axios.post(`${AI_SERVICE_URL}/analyze/image`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    res.json(response.data);
  } catch (error) {
    console.error('Image analysis error:', error.message);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
    
    res.status(500).json({
      error: 'Image analysis failed',
      message: error.message
    });
  }
});

// Comprehensive multimodal analysis
router.post('/analyze/comprehensive', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    
    const formData = new FormData();
    
    // Add text data
    if (req.body.symptom_text) {
      formData.append('symptom_text', req.body.symptom_text);
    }
    if (req.body.breed) {
      formData.append('breed', req.body.breed);
    }
    if (req.body.age) {
      formData.append('age', req.body.age);
    }
    if (req.body.sex) {
      formData.append('sex', req.body.sex);
    }
    
    if (req.files && req.files.image) {
      formData.append('image', fs.createReadStream(req.files.image[0].path));
    }
    
    if (req.files && req.files.audio) {
      formData.append('audio', fs.createReadStream(req.files.audio[0].path));
    }

    const response = await axios.post(`${AI_SERVICE_URL}/analyze/comprehensive`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    if (req.files) {
      const filesToDelete = [];
      if (req.files.image) filesToDelete.push(req.files.image[0].path);
      if (req.files.audio) filesToDelete.push(req.files.audio[0].path);
      
      filesToDelete.forEach(filePath => {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Comprehensive analysis error:', error.message);
    
    if (req.files) {
      const filesToDelete = [];
      if (req.files.image) filesToDelete.push(req.files.image[0].path);
      if (req.files.audio) filesToDelete.push(req.files.audio[0].path);
      
      filesToDelete.forEach(filePath => {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      });
    }
    
    res.status(500).json({
      error: 'Comprehensive analysis failed',
      message: error.message
    });
  }
});

router.get('/history/:dogId', async (req, res) => {
  try {
    const { dogId } = req.params;
    
    res.json({
      dogId,
      analyses: [],
      message: 'Analysis history feature coming soon'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch analysis history',
      message: error.message
    });
  }
});

module.exports = router;
