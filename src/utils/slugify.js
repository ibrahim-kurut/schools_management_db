const slugify = require('slugify');

/**
 * وظيفة لتحويل النصوص (مثل اسم المدرسة) إلى رابط لطيف (Slug)
 * مثال: "مدرسة الفلاح الأهلية" -> "مدرسة-الفلاح-الأهلية"
 */
const createSlug = (text) => {
    if (!text) return '';

    return slugify(text, {
        replacement: '-',  // استبدال المسافات بشرطة
        lower: true,       // تحويل الأحرف الإنجليزية لصغيرة (إن وجدت)
        strict: true,      // حذف الرموز الخاصة مثل (@, #, $)
        locale: 'ar',      // دعم اللغة العربية
        trim: true         // حذف المسافات من الأطراف
    });
};

module.exports = { createSlug };