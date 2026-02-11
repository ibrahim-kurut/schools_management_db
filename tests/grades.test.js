const {
    createGradeService,
    getGradesByStudentIdService,
    getStudentGradesService,
    getSubjectTeacherStudentGradesService,
    updateGradeService
} = require('../src/services/gradesService');
const prisma = require('../src/utils/prisma');
const { calculateAveragesIfNeeded } = require('../src/services/gradeCalculations');

// Define mocks inside the factory to share them between prisma and transaction
jest.mock('../src/utils/prisma', () => {
    const mockGrade = {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    };
    return {
        academicYear: {
            findFirst: jest.fn(),
        },
        subject: {
            findFirst: jest.fn(),
        },
        user: {
            findFirst: jest.fn(),
        },
        grade: mockGrade,
        $transaction: jest.fn((callback) => callback({ grade: mockGrade })),
    };
});

jest.mock('../src/services/gradeCalculations', () => ({
    calculateAveragesIfNeeded: jest.fn(),
}));

describe('Grades Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createGradeService', () => {
        const mockGradeData = {
            studentId: 1,
            subjectId: 1,
            academicYearId: 1,
            examType: 'OCTOBER', // Valid manual exam type
            score: 85
        };
        const schoolId = 1;
        const userId = 2; // Teacher ID
        const userRole = 'TEACHER';

        it('should create a grade successfully', async () => {
            prisma.academicYear.findFirst.mockResolvedValue({ id: 1 });
            prisma.subject.findFirst.mockResolvedValue({
                id: 1,
                teacherId: userId,
                class: { id: 10, schoolId }
            });
            prisma.user.findFirst.mockResolvedValue({ id: 1, classId: 10 }); // Student
            prisma.grade.create.mockResolvedValue({ ...mockGradeData, id: 100 });

            const result = await createGradeService(mockGradeData, schoolId, userId, userRole);

            expect(result).toHaveProperty('id', 100);
            expect(prisma.grade.create).toHaveBeenCalled();
            expect(calculateAveragesIfNeeded).toHaveBeenCalled();
        });

        it('should throw error if exam type is invalid', async () => {
            await expect(createGradeService({ ...mockGradeData, examType: 'INVALID' }, schoolId, userId, userRole))
                .rejects.toHaveProperty('message', 'Invalid exam type');
        });

        it('should throw error if manually entering calculated grade', async () => {
            await expect(createGradeService({ ...mockGradeData, examType: 'FIRST_SEMESTER_AVG' }, schoolId, userId, userRole))
                .rejects.toHaveProperty('message', 'Cannot manually enter calculated grade types.');
        });

        it('should throw error if academic year or subject or student not found', async () => {
            prisma.academicYear.findFirst.mockResolvedValue(null);

            // Should fail with 404 because examType is valid
            await expect(createGradeService(mockGradeData, schoolId, userId, userRole))
                .rejects.toHaveProperty('statusCode', 404);
        });

        it('should throw error if teacher is not authorized for subject', async () => {
            prisma.academicYear.findFirst.mockResolvedValue({ id: 1 });
            prisma.subject.findFirst.mockResolvedValue({
                id: 1,
                teacherId: 999, // Different teacher
                class: { id: 10, schoolId }
            });
            prisma.user.findFirst.mockResolvedValue({ id: 1, classId: 10 });

            await expect(createGradeService(mockGradeData, schoolId, userId, userRole))
                .rejects.toHaveProperty('message', 'Not authorized for this subject');
        });

        it('should throw error if student is not in the class', async () => {
            prisma.academicYear.findFirst.mockResolvedValue({ id: 1 });
            prisma.subject.findFirst.mockResolvedValue({
                id: 1,
                teacherId: userId,
                class: { id: 10, schoolId }
            });
            prisma.user.findFirst.mockResolvedValue({ id: 1, classId: 11 }); // Different class

            await expect(createGradeService(mockGradeData, schoolId, userId, userRole))
                .rejects.toHaveProperty('message', "Student is not in the subject's class");
        });
    });

    describe('getGradesByStudentIdService', () => {
        it('should fetch grades for a student (School Admin)', async () => {
            const studentId = 1;
            const schoolId = 1;

            prisma.user.findFirst.mockResolvedValue({ id: studentId });
            prisma.grade.findMany.mockResolvedValue([{ id: 1, score: 90 }]);

            const result = await getGradesByStudentIdService(studentId, schoolId, 'SCHOOL_ADMIN');
            expect(result).toHaveLength(1);
        });

        it('should throw error if user is not authorized', async () => {
            const studentId = 1;
            const schoolId = 1;

            prisma.user.findFirst.mockResolvedValue({ id: studentId });

            await expect(getGradesByStudentIdService(studentId, schoolId, 'TEACHER'))
                .rejects.toHaveProperty('message', "Not authorized to view all student grades");
        });
    });

    describe('getStudentGradesService', () => {
        it('should fetch own grades for student', async () => {
            const studentId = 1;
            const schoolId = 1;

            prisma.user.findFirst.mockResolvedValue({ id: studentId });
            prisma.grade.findMany.mockResolvedValue([{ id: 1, score: 90 }]);

            const result = await getStudentGradesService(studentId, schoolId);
            expect(result).toHaveLength(1);
        });
    });

    describe('updateGradeService', () => {
        const updateData = { gradeId: 100, score: 95 };
        const schoolId = 1;
        const userId = 2;

        it('should update grade successfully', async () => {
            prisma.grade.findFirst.mockResolvedValue({
                id: 100,
                studentId: 1,
                subjectId: 1,
                academicYearId: 1,
                teacherId: userId,
                isCalculated: false,
                subject: {
                    teacherId: userId,
                    class: { schoolId }
                }
            });
            prisma.grade.update.mockResolvedValue({ id: 100, score: 95 });

            const result = await updateGradeService(1, updateData, schoolId, userId, 'TEACHER');

            expect(prisma.grade.update).toHaveBeenCalled();
            expect(calculateAveragesIfNeeded).toHaveBeenCalled();
            expect(result).toHaveProperty('score', 95);
        });

        it('should throw error if grade is calculated', async () => {
            prisma.grade.findFirst.mockResolvedValue({
                id: 100,
                isCalculated: true,
                subject: { class: { schoolId } }
            });

            await expect(updateGradeService(1, updateData, schoolId, userId, 'TEACHER'))
                .rejects.toHaveProperty('message', "Cannot manually update automatically calculated grades");
        });
    });
});
