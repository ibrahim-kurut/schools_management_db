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

    res.status(statusCode).json({
        status: "ERROR",
        message: isProd
            ? "Internal server error. Please try again later."
            : err.message,
        ...(isProd ? {} : { stack: err.stack })
    });
};

module.exports = errorHandler;
