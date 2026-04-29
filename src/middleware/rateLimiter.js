const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

/**
 * Build a RedisStore if Redis is connected, otherwise return undefined
 * so express-rate-limit falls back to its built-in MemoryStore.
 * @param {string} prefix - Unique prefix for the rate limiter keys
 */
function createStore(prefix) {
    try {
        if (redis && typeof redis.call === 'function') {
            return new RedisStore({
                prefix: prefix,
                // Send the command to Redis. If it fails, reject the promise.
                sendCommand: (...args) => redis.call(...args),
            });
        }
    } catch (err) {
        console.error(`⚠️ Rate limiter [${prefix}]: failed to create RedisStore:`, err.message);
    }

    console.warn(`⚠️ Rate limiter [${prefix}]: using in-memory store (Redis unavailable)`);
    return undefined; // express-rate-limit defaults to MemoryStore
}

// General Rate Limiter (500 requests per 15 minutes)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    // Skip all login routes — they have their own dedicated authLimiter (5 mins)
    skip: (req) => req.method === 'POST' && /\/login(\/)?$/.test(req.originalUrl),
    store: createStore('rl:global:'),
    passOnStoreError: true, // Allow request to continue if Redis fails
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


// Auth Rate Limiter (10 requests per 5 minutes)
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('rl:auth:'),
    passOnStoreError: true, // Allow request to continue if Redis fails
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
