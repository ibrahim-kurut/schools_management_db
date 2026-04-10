const multer = require('multer');

/**
 * @description ميدلوير مخصص لرفع ملفات الإكسل و CSV
 * -------------------------------------------------------
 * يستخدم MemoryStorage لتخزين الملف مؤقتاً في الذاكرة (RAM) كـ Buffer.
 * هذا يسمح لنا بقراءة محتوى الملف مباشرة عبر مكتبة xlsx دون الحاجة
 * لحفظه على القرص الصلب أو في خدمة تخزين خارجية.
 * -------------------------------------------------------
 * الحد الأقصى لحجم الملف: 5 ميجابايت
 * الصيغ المقبولة: .xlsx, .csv
 */

const storage = multer.memoryStorage();

const excelFileFilter = (req, file, cb) => {
    // الصيغ المسموح بها لملفات الإكسل و CSV
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls (قديم)
        'text/csv', // .csv
        'application/csv', // .csv (بعض المتصفحات ترسله بهذه الصيغة)
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('صيغة الملف غير مدعومة. يرجى رفع ملف بصيغة Excel (.xlsx) أو CSV (.csv) فقط.'), false);
    }
};

const uploadExcel = multer({
    storage,
    fileFilter: excelFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB كحد أقصى لحماية السيرفر
    },
});

module.exports = uploadExcel;
