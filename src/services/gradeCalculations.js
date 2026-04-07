/**
 * وحدة حسابات الدرجات
 * تتولى حساب المتوسطات تلقائياً للفصول الدراسية والدرجات السنوية
 */

// دوال مساعدة
// التحقق من أن القيم موجودة وليست خالية (null) أو غير معرفة (undefined)
const has = (map, ...keys) => keys.every(k => map[k] !== undefined && map[k] !== null);
// حساب المتوسط الحسابي للأرقام
const avg = (...nums) => nums.reduce((a, b) => a + b, 0) / nums.length;

/**
 * @description حساب المتوسطات تلقائياً بناءً على الدرجات اليدوية
 * تستخدم عميل المعاملة (tx) لضمان اتساق البيانات
 */
async function calculateAveragesIfNeeded(tx, studentId, subjectId, academicYearId, teacherId) {
    // جلب جميع درجات الطالب في المادة والسنة الدراسية
    const grades = await tx.grade.findMany({
        where: { studentId, subjectId, academicYearId },
        select: { examType: true, score: true }
    });

    // تحويل مصفوفة الدرجات إلى خريطة (نوع الامتحان => الدرجة) لتسهيل الوصول
    const gradeMap = grades.reduce((acc, g) => ({ ...acc, [g.examType]: g.score }), {});

    // دالة مساعدة: إنشاء أو تحديث درجة محسوبة
    const upsertCalc = async (type, val) => {
        const score = parseFloat(val.toFixed(2));
        await tx.grade.upsert({
            where: { studentId_subjectId_academicYearId_examType: { studentId, subjectId, academicYearId, examType: type } },
            update: { score },
            create: { studentId, subjectId, academicYearId, teacherId, examType: type, score, isCalculated: true }
        });
        gradeMap[type] = score; // تحديث الخريطة المحلية للاستخدام المتسلسل
    };

    // دالة مساعدة: حذف درجة محسوبة إذا لم تعد صالحة
    const deleteCalc = async (type) => {
        await tx.grade.deleteMany({
            where: { studentId, subjectId, academicYearId, examType: type, isCalculated: true }
        });
        delete gradeMap[type];
    };

    // 1. معدل الفصل الأول (تشرين الأول + تشرين الثاني + كانون الأول) - يقبل 2 أو 3 امتحانات
    const firstSemesterExams = ['OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const availableF1 = firstSemesterExams.filter(k => has(gradeMap, k));
    
    if (availableF1.length >= 2) {
        const scores = availableF1.map(k => gradeMap[k]);
        const f1Score = avg(...scores);
        await upsertCalc('FIRST_SEMESTER_AVG', f1Score);
        gradeMap.FIRST_SEMESTER_AVG = f1Score;
    } else {
        await deleteCalc('FIRST_SEMESTER_AVG');
    }

    // 2. معدل الفصل الثاني (آذار + نيسان) - يتطلب الامتحانات جميعها
    if (has(gradeMap, 'MARCH', 'APRIL')) {
        const f2Score = avg(gradeMap.MARCH, gradeMap.APRIL);
        await upsertCalc('SECOND_SEMESTER_AVG', f2Score);
        gradeMap.SECOND_SEMESTER_AVG = f2Score;
    } else {
        await deleteCalc('SECOND_SEMESTER_AVG');
    }

    // 3. السعي السنوي (السعي = معدل الفصل الاول + نصف السنة + معدل الفصل الثاني / 3)
    if (has(gradeMap, 'FIRST_SEMESTER_AVG', 'MIDYEAR', 'SECOND_SEMESTER_AVG')) {
        await upsertCalc('ANNUAL_EFFORT', avg(gradeMap.FIRST_SEMESTER_AVG, gradeMap.MIDYEAR, gradeMap.SECOND_SEMESTER_AVG));
    } else {
        await deleteCalc('ANNUAL_EFFORT');
    }

    // 4. النتيجة النهائية (= السعي + الدرجة النهائية / 2)
    if (has(gradeMap, 'ANNUAL_EFFORT', 'FINAL_EXAM')) {
        await upsertCalc('FINAL_GRADE', avg(gradeMap.ANNUAL_EFFORT, gradeMap.FINAL_EXAM));
    } else {
        await deleteCalc('FINAL_GRADE');
    }

    // 5. الدور الثاني (السعي السنوي + امتحان الدور الثاني)
    if (has(gradeMap, 'ANNUAL_EFFORT', 'SECOND_ROUND_EXAM')) {
        await upsertCalc('LAST_GRADE', avg(gradeMap.ANNUAL_EFFORT, gradeMap.SECOND_ROUND_EXAM));
    } else {
        await deleteCalc('LAST_GRADE');
    }
}

module.exports = {
    calculateAveragesIfNeeded
};
