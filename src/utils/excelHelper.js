const XLSX = require('xlsx');

/**
 * الحد الأقصى لعدد الطلاب المسموح بهم في ملف واحد
 */
const MAX_ROWS = 100;

/**
 * @description تحليل Buffer الإكسل وتحويله إلى مصفوفة كائنات
 * -------------------------------------------------------
 * كيف يعمل التعامل مع Buffer الخاص بـ multer:
 *   - عند استخدام multer مع MemoryStorage، الملف المُرفوع يُخزّن في req.file.buffer
 *     كـ Node.js Buffer (بيانات ثنائية في الذاكرة).
 *   - مكتبة xlsx تقرأ هذا الـ Buffer مباشرة عبر XLSX.read(buffer, { type: 'buffer' })
 *     دون الحاجة لحفظ الملف على القرص الصلب.
 *   - بعد القراءة، نأخذ أول Sheet ونحوّلها إلى JSON باستخدام sheet_to_json.
 * -------------------------------------------------------
 * @param {Buffer} fileBuffer - Buffer الملف من multer (req.file.buffer)
 * @returns {{ data: Array<Object>, errors: Array<string> }}
 */
const parseExcelBuffer = (fileBuffer) => {
    const errors = [];

    // 1. قراءة الـ Buffer وتحويله إلى Workbook
    let workbook;
    try {
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch (err) {
        errors.push('الملف تالف أو غير مدعوم. يرجى رفع ملف Excel (.xlsx) أو CSV (.csv) صالح.');
        return { data: [], errors };
    }

    // 2. أخذ أول ورقة عمل (Sheet) من الملف
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        errors.push('الملف فارغ ولا يحتوي على أي ورقة عمل.');
        return { data: [], errors };
    }

    const sheet = workbook.Sheets[sheetName];

    // 3. تحويل الورقة إلى مصفوفة كائنات JSON
    //    defval: '' يعني أن الخلايا الفارغة ستأخذ قيمة فارغة بدل undefined
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData || rawData.length === 0) {
        errors.push('الملف لا يحتوي على أي بيانات. يرجى التأكد من ملء البيانات أسفل عناوين الأعمدة.');
        return { data: [], errors };
    }

    // 4. التحقق من عدد الصفوف (الحد الأقصى 100 طالب)
    if (rawData.length > MAX_ROWS) {
        errors.push(`لا يمكن رفع أكثر من ${MAX_ROWS} طالب دفعة واحدة. الملف يحتوي على ${rawData.length} صف.`);
        return { data: [], errors };
    }

    return { data: rawData, errors };
};

/**
 * @description تطهير وتحقق من بيانات كل صف من صفوف الإكسل
 * @param {Array<Object>} rawRows - المصفوفة الخام من parseExcelBuffer
 * @returns {{ students: Array<Object>, errors: Array<string> }}
 */
const sanitizeAndValidateRows = (rawRows) => {
    const errors = [];
    const students = [];

    // التحقق من وجود الأعمدة الإجبارية في أول صف
    const firstRow = rawRows[0];
    const requiredColumns = ['firstName', 'lastName', 'parentPhone', 'birthDate', 'gender'];
    const missingCols = requiredColumns.filter(col => !(col in firstRow));

    if (missingCols.length > 0) {
        errors.push(`الأعمدة التالية مفقودة في الملف: ${missingCols.join(', ')}. يرجى استخدام النموذج الصحيح.`);
        return { students: [], errors };
    }

    // القيم المسموحة للجنس
    const validGenders = ['MALE', 'FEMALE', 'ذكر', 'أنثى'];

    rawRows.forEach((row, index) => {
        const rowNum = index + 2; // +2 لأن الصف الأول هو العناوين والـ index يبدأ من 0

        // --- تطهير الاسم الأول ---
        const firstName = String(row.firstName || '').trim();
        if (!firstName) {
            errors.push(`الصف ${rowNum}: الاسم الأول فارغ.`);
            return;
        }

        // --- تطهير الاسم الثاني ---
        const lastName = String(row.lastName || '').trim();
        if (!lastName) {
            errors.push(`الصف ${rowNum}: اسم العائلة فارغ.`);
            return;
        }

        // --- تطهير رقم الهاتف ---
        let parentPhone = String(row.parentPhone || '').trim().replace(/\s/g, '');

        // التحقق من أن الرقم يتكون من أرقام فقط
        if (!/^\d+$/.test(parentPhone)) {
            errors.push(`الصف ${rowNum}: رقم هاتف ولي الأمر (${row.parentPhone}) يحتوي على أحرف غير رقمية.`);
            return;
        }

        // التحقق من أن الرقم يتكون من 10 أو 11 رقماً
        if (parentPhone.length !== 10 && parentPhone.length !== 11) {
            errors.push(`الصف ${rowNum}: رقم هاتف ولي الأمر (${parentPhone}) يجب أن يتكون من 10 أو 11 رقماً. الرقم الحالي يتكون من ${parentPhone.length} رقماً.`);
            return;
        }

        // --- تطهير تاريخ الميلاد ---
        let birthDate = row.birthDate;
        if (!birthDate) {
            errors.push(`الصف ${rowNum}: تاريخ الميلاد فارغ.`);
            return;
        }
        // إذا كان التاريخ رقم (Serial Date من إكسل)، نحوله إلى تاريخ
        if (typeof birthDate === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            birthDate = new Date(excelEpoch.getTime() + birthDate * 86400000);
        } else {
            birthDate = new Date(birthDate);
        }
        if (isNaN(birthDate.getTime())) {
            errors.push(`الصف ${rowNum}: تاريخ الميلاد (${row.birthDate}) غير صالح. استخدم صيغة YYYY-MM-DD.`);
            return;
        }

        // --- تطهير الجنس ---
        let gender = String(row.gender || '').trim();
        if (!gender) {
            errors.push(`الصف ${rowNum}: حقل الجنس فارغ.`);
            return;
        }
        // تحويل العربي إلى الإنجليزي
        if (gender === 'ذكر') gender = 'MALE';
        else if (gender === 'أنثى') gender = 'FEMALE';
        else gender = gender.toUpperCase();

        if (!['MALE', 'FEMALE'].includes(gender)) {
            errors.push(`الصف ${rowNum}: قيمة الجنس (${row.gender}) غير صالحة. القيم المسموحة: MALE, FEMALE, ذكر, أنثى.`);
            return;
        }

        // --- تطهير كود الطالب (اختياري) ---
        const studentCode = row.studentCode ? String(row.studentCode).trim() : null;

        // --- تطهير اسم الأم (اختياري) ---
        const motherName = row.motherName ? String(row.motherName).trim() : null;

        // --- تطهير الحالة الاجتماعية لولي الأمر (اختياري) ---
        const guardianMaritalStatus = row.guardianMaritalStatus ? String(row.guardianMaritalStatus).trim() : null;

        students.push({
            firstName,
            lastName,
            parentPhone,
            birthDate,
            gender,
            studentCode,
            motherName,
            guardianMaritalStatus,
        });
    });

    return { students, errors };
};

/**
 * @description توليد ملف Excel فارغ كنموذج (Template) للتحميل
 * يتضمن جميع الأعمدة المطلوبة والاختيارية مع بيانات توضيحية
 * @returns {Buffer} Buffer ملف الإكسل الجاهز للإرسال
 */
const generateTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['firstName', 'lastName', 'parentPhone', 'birthDate', 'gender', 'studentCode', 'motherName', 'guardianMaritalStatus'],
        ['أحمد', 'محمد علي', '07701234567', '2012-05-15', 'ذكر', '', 'فاطمة حسن', 'متزوج'],
        ['سارة', 'حسن كريم', '07809876543', '2011-09-20', 'أنثى', '', 'نور محمد', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // تعيين عرض الأعمدة لجعل الملف أكثر وضوحاً
    ws['!cols'] = [
        { wch: 15 }, // firstName
        { wch: 18 }, // lastName
        { wch: 15 }, // parentPhone
        { wch: 14 }, // birthDate
        { wch: 10 }, // gender
        { wch: 14 }, // studentCode
        { wch: 18 }, // motherName
        { wch: 22 }, // guardianMaritalStatus
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
    parseExcelBuffer,
    sanitizeAndValidateRows,
    generateTemplate,
    MAX_ROWS,
};
