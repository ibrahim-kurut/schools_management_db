const express = require('express');
const app = express();

// Middlewares
app.use(express.json());

// Routes 
app.use('/api/auth', require('./routes/authRoutes'));
module.exports = app;