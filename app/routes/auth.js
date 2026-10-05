const express = require('express');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const sendWelcomeEmail = require('../routes/mailer');

const router = express.Router();


// Password validation function
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
};

// Signup Validation
const validationRules = [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Valid email required'),
  check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  check('confirmPassword').custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match')
];

// GET Signup
router.get('/signup', (req, res) => {
  res.render('signup', { errorMessage: null });
});

// POST Signup
router.post('/signup', validationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('signup', {
      errorMessage: errors.array()[0].msg
    });
  }

  const { name, email, password } = req.body;

  // Additional password validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.render('signup', { errorMessage: passwordValidation.message });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('signup', { errorMessage: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    sendWelcomeEmail(email, name);

    // Auto-login and redirect
    req.session.user = { _id: newUser._id, name, email };
    res.redirect('/?welcome=true');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', { errorMessage: 'An error occurred. Please try again.' });
  }
});

// GET Login
router.get('/login', (req, res) => {
  res.render('login');
});

// POST Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { errorMessage: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { errorMessage: 'Invalid email or password.' });
    }

    req.session.user = { _id: user._id, name: user.name, email: user.email };
    res.redirect('/?login=true');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { errorMessage: 'Something went wrong. Please try again.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.redirect('/?logout=true');
  });
});

module.exports = router;
