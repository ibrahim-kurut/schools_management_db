const {
    getFinanceStatsService,
    getMonthlyFinanceReportService,
    getFinanceDashboardDetailsService
} = require('../src/services/financeService');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

jest.mock('../src/utils/prisma', () => ({
    school: {
        findUnique: jest.fn(),
    },
    payment: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
    },
    expense: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
    },
    user: {
        groupBy: jest.fn(),
    },
    feeStructure: {
        findMany: jest.fn(),
    },
    class: {
        findMany: jest.fn(),
    }
}));

jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
}));

// Mock xlsx to avoid binary issues in tests
jest.mock('xlsx', () => ({
    utils: {
        book_new: jest.fn(() => ({})),
        json_to_sheet: jest.fn(() => ({})),
        book_append_sheet: jest.fn(),
    },
    write: jest.fn(() => Buffer.from('mock-excel')),
}));

describe('Finance Service Tests', () => {
    const schoolId = '550e8400-e29b-41d4-a716-446655440000';
    const requester = { role: 'SUPER_ADMIN', schoolId: schoolId };

    beforeEach(() => {
        jest.clearAllMocks();
        prisma.school.findUnique.mockResolvedValue({ id: schoolId, name: 'Test School', isDeleted: false });
    });

    describe('getFinanceStatsService', () => {
        it('should return cached stats if available', async () => {
            const cachedData = { totalRevenue: 1000, totalExpenses: 500, netBalance: 500 };
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await getFinanceStatsService(requester, schoolId);

            expect(result).toEqual(cachedData);
            expect(prisma.payment.aggregate).not.toHaveBeenCalled();
        });

        it('should return calculated stats and cache them', async () => {
            redis.get.mockResolvedValue(null);

            prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
            prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
            prisma.user.groupBy.mockResolvedValue([{ classId: 1, _count: { _all: 10 } }]);
            prisma.feeStructure.findMany.mockResolvedValue([{ gradeId: 1, amount: 100 }]);
            prisma.class.findMany.mockResolvedValue([{ id: 1, tuitionFee: 100 }]);

            const result = await getFinanceStatsService(requester, schoolId);

            expect(result.totalRevenue).toBe(1000);
            expect(result.totalExpenses).toBe(500);
            expect(result.netBalance).toBe(500);
            expect(redis.set).toHaveBeenCalled();
        });

        it('should handle unauthorized access', async () => {
            const unauthorizedRequester = { role: 'SCHOOL_ADMIN', schoolId: 2 };
            await expect(getFinanceStatsService(unauthorizedRequester, 1))
                .rejects
                .toThrow("You do not have permission to access this school's finance stats");
        });
    });

    describe('getMonthlyFinanceReportService', () => {
        it('should return monthly report successfully', async () => {
            const month = '2023-10';

            prisma.payment.findMany.mockResolvedValue([
                { id: 1, amount: 200, date: new Date(), paymentType: 'CASH', status: 'COMPLETED' }
            ]);
            prisma.expense.findMany.mockResolvedValue([
                { id: 1, amount: 50, date: new Date(), type: 'MAINTENANCE' }
            ]);
            prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 200 } });
            prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

            const result = await getMonthlyFinanceReportService(requester, schoolId, month);

            expect(result.summary.totalRevenue).toBe(200);
            expect(result.summary.totalExpenses).toBe(50);
            expect(result.payments.length).toBe(1);
            expect(result.expenses.length).toBe(1);
        });

        it('should throw error for invalid month format', async () => {
            await expect(getMonthlyFinanceReportService(requester, schoolId, 'invalid-month'))
                .rejects
                .toThrow("Invalid month format. Use YYYY-MM");
        });
    });

    describe('getFinanceDashboardDetailsService', () => {
        it('should return recent operations and chart data from cache', async () => {
            const cachedData = { chartData: [], recentOperations: [] };
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await getFinanceDashboardDetailsService(requester, schoolId, 6);

            expect(result).toEqual(cachedData);
            expect(prisma.payment.findMany).not.toHaveBeenCalled();
        });

        it('should correctly build dashboard details and cache them', async () => {
            redis.get.mockResolvedValue(null);

            const now = new Date();
            prisma.payment.findMany.mockResolvedValue([
                { amount: 500, date: now, student: { firstName: 'Ali', lastName: 'O' } }
            ]);
            prisma.expense.findMany.mockResolvedValue([
                { amount: 100, date: now, title: 'Books' }
            ]);

            const result = await getFinanceDashboardDetailsService(requester, schoolId, 6);

            expect(result.chartData.length).toBe(6);
            expect(result.recentOperations.length).toBe(2);
            expect(result.recentOperations[0].type).toBeDefined();
            expect(redis.set).toHaveBeenCalled();
        });
    });
});
