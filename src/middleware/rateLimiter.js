const rateLimit = require('express-rate-limit');

// General Rate Limiter (100 requests per 15 minutes)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: {
        success: false,
        message: 'لقد تجاوزت حد الطلبات المسموح به، يرجى المحاولة لاحقاً.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth Rate Limiter (5 requests per 15 minutes)
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
    message: {
        success: false,
        message: 'لقد تجاوزت عدد محاولات تسجيل الدخول المسموح بها، يرجى المحاولة لاحقاً.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter
};
