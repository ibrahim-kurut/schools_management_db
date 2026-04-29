const logger = require('../utils/logger');

/**
 * @description Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';

    // Log the error
    logger.error(`${err.message}`, {
        url: req.originalUrl,
        method: req.method,
        stack: err.stack,
    });

    // In production, hide the error message ONLY for 500 errors
    const shouldHideMessage = isProd && statusCode === 500;

    res.status(statusCode).json({
        status: "ERROR",
        message: shouldHideMessage
            ? "حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً."
            : err.message,
        ...(isProd ? {} : { stack: err.stack })
    });
};

module.exports = errorHandler;
