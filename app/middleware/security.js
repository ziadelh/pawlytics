const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting for different endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 10, 
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Input sanitization
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Session security
const sessionSecurity = (req, res, next) => {
  if (req.path === '/login' && req.method === 'POST') {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Session error' });
      }
      next();
    });
  } else {
    next();
  }
};

// Authentication guard
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// File upload security
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const allowedTypes = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
  };

  const maxFileSize = 50 * 1024 * 1024; 

  const files = req.files ? Object.values(req.files).flat() : [req.file];
  
  for (const file of files) {
    if (file.size > maxFileSize) {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 50MB.' 
      });
    }

    if (!allowedTypes[file.mimetype]) {
      return res.status(400).json({ 
        error: 'Invalid file type. Allowed types: images, audio.' 
      });
    }
  }

  next();
};



// Audit logging
const auditLog = (action, userId, details = {}) => {
  const logEntry = {
    timestamp: new Date(),
    action,
    userId,
    details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown'
  };
  
  console.log('AUDIT:', JSON.stringify(logEntry));
};

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  securityHeaders,
  sanitizeInput,
  sessionSecurity,
  requireAuth,
  validateFileUpload,
  auditLog
};