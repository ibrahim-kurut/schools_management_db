/**
 * وحدة حسابات الدرجات
 * تتولى حساب المتوسطات تلقائياً للفصول الدراسية والدرجات السنوية
 */

// دوال مساعدة
// التحقق من وجود جميع المفاتيح في الخريطة
const has = (map, ...keys) => keys.every(k => map[k] !== undefined);
// حساب المتوسط الحسابي للأرقام
const avg = (...nums) => nums.reduce((a, b) => a + b, 0) / nums.length;

/**
 * @description حساب المتوسطات تلقائياً بناءً على الدرجات اليدوية
 * تستخدم عميل المعاملة (tx) لضمان اتساق البيانات
 * @param {Object} tx - عميل معاملة Prisma
 * @param {string} studentId
 * @param {string} subjectId
 * @param {string} academicYearId
 * @param {string} teacherId
 */
async function calculateAveragesIfNeeded(tx, studentId, subjectId, academicYearId, teacherId) {
    // جلب جميع درجات الطالب في المادة والسنة الدراسية
    const grades = await tx.grade.findMany({
        where: { studentId, subjectId, academicYearId },
        select: { examType: true, score: true }
    });

    // تحويل مصفوفة الدرجات إلى خريطة (نوع الامتحان => الدرجة) لتسهيل الوصول
    const gradeMap = grades.reduce((acc, g) => ({ ...acc, [g.examType]: g.score }), {});

    // دالة مساعدة: إنشاء أو تحديث درجة محسوبة في قاعدة البيانات
    const upsertCalc = async (type, val) => {
        const score = parseFloat(val.toFixed(2));  // تقريب الدرجة إلى منزلتين عشريتين
        await tx.grade.upsert({
            where: {
                studentId_subjectId_academicYearId_examType: {
                    studentId, subjectId, academicYearId, examType: type
                }
            },
            update: { score },  // تحديث إذا كانت موجودة
            create: {  // إنشاء إذا لم تكن موجودة
                studentId, subjectId, academicYearId, teacherId,
                examType: type, score, isCalculated: true
            }
        });
    };

    // 1. متوسط الفصل الأول (أكتوبر + نوفمبر + ديسمبر)
    if (has(gradeMap, 'OCTOBER', 'NOVEMBER', 'DECEMBER')) {
        await upsertCalc('FIRST_SEMESTER_AVG', avg(gradeMap.OCTOBER, gradeMap.NOVEMBER, gradeMap.DECEMBER));
    }

    // 2. متوسط الفصل الثاني (مارس + أبريل)
    if (has(gradeMap, 'MARCH', 'APRIL')) {
        await upsertCalc('SECOND_SEMESTER_AVG', avg(gradeMap.MARCH, gradeMap.APRIL));
    }

    // الحصول على متوسط الفصل الأول (من الخريطة أو حسابه إن لم يكن موجوداً)
    let firstAvg = gradeMap.FIRST_SEMESTER_AVG;
    if (!firstAvg && has(gradeMap, 'OCTOBER', 'NOVEMBER', 'DECEMBER')) {
        firstAvg = avg(gradeMap.OCTOBER, gradeMap.NOVEMBER, gradeMap.DECEMBER);
    }

    // الحصول على متوسط الفصل الثاني (من الخريطة أو حسابه إن لم يكن موجوداً)
    let secondAvg = gradeMap.SECOND_SEMESTER_AVG;
    if (!secondAvg && has(gradeMap, 'MARCH', 'APRIL')) {
        secondAvg = avg(gradeMap.MARCH, gradeMap.APRIL);
    }

    // 3. السعي السنوي (متوسط الفصل الأول + امتحان نصف السنة + متوسط الفصل الثاني)
    let annualEffort = gradeMap.ANNUAL_EFFORT;
    if (firstAvg !== undefined && gradeMap.MIDYEAR !== undefined && secondAvg !== undefined) {
        annualEffort = avg(firstAvg, gradeMap.MIDYEAR, secondAvg);
        await upsertCalc('ANNUAL_EFFORT', annualEffort);
    }

    // 4. الدرجة النهائية (السعي السنوي + امتحان نهاية السنة)
    if (annualEffort !== undefined && gradeMap.FINAL_EXAM !== undefined) {
        await upsertCalc('FINAL_GRADE', avg(annualEffort, gradeMap.FINAL_EXAM));
    }

    // 5. الدرجة الأخيرة (السعي السنوي + امتحان الدور الثاني)
    if (annualEffort !== undefined && gradeMap.SECOND_ROUND_EXAM !== undefined) {
        await upsertCalc('LAST_GRADE', avg(annualEffort, gradeMap.SECOND_ROUND_EXAM));
    }
}

module.exports = {
    calculateAveragesIfNeeded
};
