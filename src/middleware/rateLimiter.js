const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

// General Rate Limiter (500 requests per 15 minutes)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    // Skip login routes — they have their own dedicated authLimiter
    skip: (req) => req.method === 'POST' && req.originalUrl.endsWith('/login'),
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
    }),
    handler: (req, res, next, options) => {
        const retryAfter = res.getHeader('Retry-After') || Math.ceil(options.windowMs / 1000);

        res.status(options.statusCode).json({
            success: false,
            message: options.message,
            retryAfter: retryAfter
        });
    },
    message: 'تم إنهاء جلستك لأسباب أمنية نتيجة كثرة الطلبات. يرجى الانتظار قليلاً قبل المحاولة مجدداً'
});


// Auth Rate Limiter (5 requests per 5 minutes)
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit each IP to 5 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
    }),
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            success: false,
            message: options.message,
            retryAfter: res.getHeader('Retry-After') || Math.ceil(options.windowMs / 1000)
        });
    },
    message: 'لقد تجاوزت عدد محاولات تسجيل الدخول المسموح بها، يرجى المحاولة بعد 5 دقائق.'
});


module.exports = {
    globalLimiter,
    authLimiter
};
