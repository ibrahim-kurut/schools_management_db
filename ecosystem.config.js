module.exports = {
  apps: [
    {
      // === الإعدادات الأساسية ===
      name: 'school-management-api',        // اسم التطبيق في PM2
      script: './src/server.js',             // ملف التشغيل الرئيسي

      // === وضع العنقود (Cluster Mode) ===
      instances: 'max',                      // تشغيل نسخة لكل نواة معالج
      exec_mode: 'cluster',                  // تفعيل وضع العنقود

      // === إدارة الذاكرة ===
      max_memory_restart: '500M',            // إعادة تشغيل عند تجاوز 500MB

      // === متغيرات البيئة (الإنتاج) ===
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000,
      },

      // === متغيرات البيئة (التطوير) ===
      env_development: {
        NODE_ENV: 'development',
        PORT: 8000,
      },

      // === إعدادات السجلات (Logs) ===
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,                      // دمج سجلات جميع النسخ

      // === إعدادات إعادة التشغيل ===
      autorestart: true,                     // إعادة تشغيل تلقائي عند التعطل
      watch: false,                          // لا نراقب تغييرات الملفات (الإنتاج)
      max_restarts: 10,                      // أقصى عدد لمحاولات إعادة التشغيل
      restart_delay: 4000,                   // انتظار 4 ثواني قبل إعادة التشغيل

      // === التحديث بدون توقف (Zero Downtime) ===
      wait_ready: true,                      // انتظار إشارة الجاهزية
      listen_timeout: 10000,                 // مهلة الانتظار: 10 ثواني
      kill_timeout: 5000,                    // مهلة إيقاف العملية: 5 ثواني
    }
  ]
};
