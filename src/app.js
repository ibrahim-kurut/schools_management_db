const express = require('express');
const app = express();

// Middlewares
app.use(express.json());

// Routes 
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/schools', require('./routes/schoolsRoutes'));
module.exports = app;