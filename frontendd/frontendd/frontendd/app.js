const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { securityHeaders, sanitizeInput, sessionSecurity } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// File upload configuration
const upload = multer({ 
  dest: 'public/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    // Allow images and audio files
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed'), false);
    }
  }
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware
app.use(securityHeaders);
app.use(sanitizeInput);

// Static & middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup with security
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production-12345',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/petai' }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Session security middleware
app.use(sessionSecurity);

// Routes
app.use('/', require('./routes/auth'));
// API routes
app.use('/api', require('./routes/dog'));
app.use('/api/health', require('./routes/health'));
app.use('/api/ai', require('./routes/ai'));

// Pages
app.get('/', (req, res) => {
  const user = req.session.user;
  const welcome = req.query.welcome === 'true';
  const login = req.query.login === 'true';
  const logout = req.query.logout === 'true';
  
  res.render('home', { 
    user, 
    welcome, 
    login, 
    logout 
  });
});

app.get('/analyze', (req, res) => {
  res.render('index', { user: req.session.user });
});

// AI Analysis page (requires login)
app.get('/ai-analysis', (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');
  res.render('aiAnalysis', { user });
});

// Dashboard (requires login)
app.get('/dashboard', (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');
  res.render('dashboard', { user });
});

// Add Dog pages 
app.get('/add-dog', (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');
  res.render('addDog', { message: null });
});

app.post('/add-dog', upload.single('image'), async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.render('addDog', { 
        errorMessage: 'No form data received. Please try again.' 
      });
    }

    const { name, breed, age } = req.body;
    if (!name || !breed || !age) {
      return res.render('addDog', { 
        errorMessage: 'Please fill in all required fields' 
      });
    }

    const Dog = require('./models/dog');
    const dogData = {
      name,
      breed,
      age: parseInt(age),
      owner: req.session.user._id
    };
    if (req.file) {
      dogData.profileImage = req.file.filename;
    }

    const dog = new Dog(dogData);
    await dog.save();

    res.render('addDog', { message: '🐾 Dog profile added successfully!' });
  } catch (error) {
    res.render('addDog', { 
      errorMessage: 'Error adding dog. Please try again.' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Connected to local MongoDB`);
});