const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { globalLimiter } = require('./middleware/rateLimiter');
const app = express();

// Trust Proxy for Docker/Nginx
app.set('trust proxy', 1);

// Pre-route Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        const isExplicitlyAllowed = allowedOrigins.includes(origin);
        const isVercelDomain = origin.endsWith('.vercel.app');

        // Logic based on environment:
        // 1. In Production: Be strict, only allow origins in ALLOWED_ORIGINS
        if (process.env.NODE_ENV === 'production') {
            if (isExplicitlyAllowed) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked production request from: ${origin}`);
                callback(new Error('Not allowed by CORS in Production'));
            }
        } 
        // 2. In Staging/Development: Be flexible, allow explicit origins + any Vercel domain
        else {
            if (isExplicitlyAllowed || isVercelDomain) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked staging/dev request from: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    exposedHeaders: ["Retry-After"]
}));

// Apply Global Rate Limiter to all /api routes
app.use('/api', globalLimiter);

// Middlewares
// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for API to prevent CORS/Network conflicts
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Routes 
app.use('/api/health', require('./routes/health'));
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
app.use('/api/notes', require('./routes/noteRoutes'));

// Error Handler Middleware (Must be last)
app.use(require('./middleware/errorHandler'));

module.exports = app;