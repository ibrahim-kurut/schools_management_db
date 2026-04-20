const app = require('./app');
require('./config/redis');
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
    console.log(`
    🚀 Server is firing up!
    📡 Listening on: http://localhost:${PORT}
    🏗️ Environment: ${process.env.NODE_ENV || 'development'}
    👷 Worker PID: ${process.pid}
    `);

    // إرسال إشارة الجاهزية لـ PM2 (يعمل فقط عند التشغيل عبر PM2)
    if (process.send) {
        process.send('ready');
    }
});

// === الإيقاف الآمن (Graceful Shutdown) ===
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

function gracefulShutdown(signal) {
    console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log('✅ Server closed. Process exiting.');
        process.exit(0);
    });

    // إجبار الإيقاف بعد 10 ثواني إذا لم يُغلق بشكل طبيعي
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
}