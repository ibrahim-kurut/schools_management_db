const { calculateAveragesIfNeeded } = require('../src/services/gradeCalculations');

describe('Grade Calculations Tests', () => {
    let mockTx;

    beforeEach(() => {
        mockTx = {
            grade: {
                findMany: jest.fn(),
                upsert: jest.fn(),
            }
        };
    });

    it('should calculate first semester average', async () => {
        mockTx.grade.findMany.mockResolvedValue([
            { examType: 'OCTOBER', score: 10 },
            { examType: 'NOVEMBER', score: 20 },
            { examType: 'DECEMBER', score: 30 }
        ]);

        await calculateAveragesIfNeeded(mockTx, 's1', 'sub1', 'y1', 't1');

        expect(mockTx.grade.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                studentId_subjectId_academicYearId_examType: expect.objectContaining({ examType: 'FIRST_SEMESTER_AVG' })
            }),
            create: expect.objectContaining({ score: 20 }), // (10+20+30)/3 = 20
            update: expect.objectContaining({ score: 20 })
        }));
    });

    it('should calculate annual effort if first semester, midyear, and second semester exist', async () => {
        // We simulate that first and second semester avgs are already calculated or passed in
        // actually the function re-calculates them if components exist
        mockTx.grade.findMany.mockResolvedValue([
            { examType: 'OCTOBER', score: 10 }, { examType: 'NOVEMBER', score: 10 }, { examType: 'DECEMBER', score: 10 }, // Avg 10
            { examType: 'MIDYEAR', score: 20 },
            { examType: 'MARCH', score: 30 }, { examType: 'APRIL', score: 30 } // Avg 30
        ]);

        await calculateAveragesIfNeeded(mockTx, 's1', 'sub1', 'y1', 't1');

        // Annual Effort = Avg(10, 20, 30) = 20
        expect(mockTx.grade.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                studentId_subjectId_academicYearId_examType: expect.objectContaining({ examType: 'ANNUAL_EFFORT' })
            }),
            create: expect.objectContaining({ score: 20 })
        }));
    });

    it('should calculate final grade', async () => {
        mockTx.grade.findMany.mockResolvedValue([
            { examType: 'OCTOBER', score: 10 }, { examType: 'NOVEMBER', score: 10 }, { examType: 'DECEMBER', score: 10 }, // Avg 10
            { examType: 'MIDYEAR', score: 10 },
            { examType: 'MARCH', score: 10 }, { examType: 'APRIL', score: 10 }, // Avg 10
            // Annual Effort = 10
            { examType: 'FINAL_EXAM', score: 20 }
        ]);

        await calculateAveragesIfNeeded(mockTx, 's1', 'sub1', 'y1', 't1');

        // Final Grade = Avg(Annual Effort (10), Final Exam (20)) = 15
        expect(mockTx.grade.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                studentId_subjectId_academicYearId_examType: expect.objectContaining({ examType: 'FINAL_GRADE' })
            }),
            create: expect.objectContaining({ score: 15 })
        }));
    });
});
