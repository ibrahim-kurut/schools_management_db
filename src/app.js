const express = require('express');
const app = express();

// Middlewares
app.use(express.json());

// Routes 
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to Schools Management API",
    status: "Running"
  });
});

module.exports = app;