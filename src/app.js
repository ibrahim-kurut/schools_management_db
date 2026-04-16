const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

// Middlewares
app.use(cors({
    origin: 'http://localhost:3000', // Update this to your production URL when ready
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Routes 
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/schools', require('./routes/schoolsRoutes'));
app.use('/api/school-user', require('./routes/schoolUserRoutes'));
app.use('/api/classes', require('./routes/classesRoutes'));
app.use('/api/subjects', require('./routes/subjectsRoutes'));
app.use('/api/academic-year', require('./routes/academicYearRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/grades', require('./routes/gradesRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/archive', require('./routes/archiveRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/admin/plans', require('./routes/admin.plans.routes'));
app.use('/api/admin/users', require('./routes/superAdminUserRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Error Handler Middleware (Must be last)
app.use(require('./middleware/errorHandler'));

module.exports = app;