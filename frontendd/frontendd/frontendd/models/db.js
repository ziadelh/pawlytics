const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/petai')
.then(() => console.log('Connected to local MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

module.exports = mongoose;