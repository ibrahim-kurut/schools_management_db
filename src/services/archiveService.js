const prisma = require("../utils/prisma");
const redis = require("../config/redis");

/**
 * @description Get all archived (soft-deleted) items for a school
 */
exports.getArchivedDataService = async (schoolId) => {
    try {
        const [classes, subjects, academicYears] = await Promise.all([
            prisma.class.findMany({
                where: { schoolId, isDeleted: true },
                select: { id: true, name: true, deletedAt: true }
            }),
            prisma.subject.findMany({
                where: { class: { schoolId }, isDeleted: true },
                include: { class: { select: { name: true } } }
            }),
            prisma.academicYear.findMany({
                where: { schoolId, isDeleted: true }
            })
        ]);

        return {
            status: "SUCCESS",
            data: {
                classes,
                subjects: subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    className: s.class.name,
                    deletedAt: s.deletedAt
                })),
                academicYears
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * @description Restore a soft-deleted item
 */
exports.restoreDataService = async (schoolId, type, id) => {
    try {
        let restoredItem = null;
        let cacheKeys = [];

        // Helper to clean deleted name
        const getCleanName = (name) => {
            if (name.includes('_deleted_')) {
                return name.split('_deleted_')[0];
            }
            return name;
        };

        switch (type) {
            case 'class':
                const classToRestore = await prisma.class.findFirst({ where: { id, schoolId } });
                if (!classToRestore) return { status: "ERROR", message: "الصف غير موجود" };
                
                // Check if name conflict exists
                const cleanClassName = getCleanName(classToRestore.name);
                const existingClass = await prisma.class.findFirst({
                    where: { schoolId, name: cleanClassName, isDeleted: false }
                });
                if (existingClass) return { status: "ERROR", message: "يوجد صف نشط بنفس الاسم حالياً." };

                restoredItem = await prisma.class.update({
                    where: { id },
                    data: { isDeleted: false, deletedAt: null, name: cleanClassName }
                });
                cacheKeys = [`school:${schoolId}:classes`, `school:${schoolId}:class:${id}`];
                break;

            case 'subject':
                const subjectToRestore = await prisma.subject.findFirst({ 
                    where: { id, class: { schoolId } },
                    include: { class: true }
                });
                if (!subjectToRestore) return { status: "ERROR", message: "المادة غير موجودة" };

                const cleanSubName = getCleanName(subjectToRestore.name);
                const existingSub = await prisma.subject.findFirst({
                    where: { classId: subjectToRestore.classId, name: cleanSubName, isDeleted: false }
                });
                if (existingSub) return { status: "ERROR", message: "توجد مادة نشطة بنفس الاسم في هذا الصف." };

                restoredItem = await prisma.subject.update({
                    where: { id },
                    data: { isDeleted: false, deletedAt: null, name: cleanSubName }
                });
                cacheKeys = [`school:${schoolId}:subjects`, `school:${schoolId}:subject:${id}`];
                break;

            case 'academicYear':
                const yearToRestore = await prisma.academicYear.findFirst({ where: { id, schoolId } });
                if (!yearToRestore) return { status: "ERROR", message: "السنة الدراسية غير موجودة" };

                const cleanYearName = getCleanName(yearToRestore.name);
                const existingYear = await prisma.academicYear.findFirst({
                    where: { schoolId, name: cleanYearName, isDeleted: false }
                });
                if (existingYear) return { status: "ERROR", message: "توجد سنة دراسية نشطة بنفس الاسم حالياً." };

                restoredItem = await prisma.academicYear.update({
                    where: { id },
                    data: { isDeleted: false, deletedAt: null, name: cleanYearName }
                });
                cacheKeys = [`school:${schoolId}:academic-years`, `school:${schoolId}:academic-year:${id}`];
                break;

            default:
                return { status: "ERROR", message: "نوع البيانات غير صالح" };
        }

        // Invalidate relevant caches
        for (const key of cacheKeys) {
            await redis.del(key);
        }

        return { status: "SUCCESS", message: "تمت استعادة البيانات بنجاح.", item: restoredItem };
    } catch (error) {
        throw error;
    }
};

/**
 * @description Permanently delete an item from the database
 */
exports.permanentDeleteService = async (schoolId, type, id) => {
    try {
        switch (type) {
            case 'class':
                // Check for safety (although UI should prevent this)
                const classUsage = await prisma.class.findFirst({
                    where: { id, schoolId },
                    include: { _count: { select: { students: true } } }
                });
                
                if (!classUsage) {
                    return { status: "ERROR", message: "الصف غير موجود." };
                }

                if (classUsage._count.students > 0) {
                    return { status: "ERROR", message: "لا يمكن الحذف النهائي: الصف مرتبط بطلاب." };
                }
                
                await prisma.class.delete({ where: { id } });
                break;
            case 'subject':
                // Check for grades before permanent delete
                const subjectGradeCount = await prisma.grade.count({
                    where: { subjectId: id }
                });
                if (subjectGradeCount > 0) {
                    return { status: "ERROR", message: "لا يمكن الحذف النهائي للمادة لوجود درجات مرصودة مرتبطة بها." };
                }

                await prisma.subject.delete({ 
                    where: { id, class: { schoolId } } 
                });
                break;
            case 'academicYear':
                // Check if current or has grades
                const yearInfo = await prisma.academicYear.findFirst({
                    where: { id, schoolId }
                });
                if (!yearInfo) return { status: "ERROR", message: "السنة الدراسية غير موجودة." };
                
                if (yearInfo.isCurrent) {
                    return { status: "ERROR", message: "لا يمكن الحذف النهائي للسنة الدراسية النشطة." };
                }

                const yearGradeCount = await prisma.grade.count({
                    where: { academicYearId: id }
                });
                if (yearGradeCount > 0) {
                    return { status: "ERROR", message: "لا يمكن الحذف النهائي للسنة الدراسية لوجود درجات مرصودة مرتبطة بها." };
                }

                await prisma.academicYear.delete({ 
                    where: { id, schoolId } 
                });
                break;
            default:
                return { status: "ERROR", message: "نوع البيانات غير صالح" };
        }

        return { status: "SUCCESS", message: "تم الحذف النهائي بنجاح." };
    } catch (error) {
        throw error;
    }
};
