const { getFinanceStatsService } = require('../src/services/financeService');

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
        payment: {
            aggregate: jest.fn(),
        },
        expense: {
            aggregate: jest.fn(),
        },
        school: {
            findUnique: jest.fn(),
        },
        user: {
            groupBy: jest.fn(),
        },
        class: {
            findMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Finance Service Unit Tests (Mocked)', () => {
    const validSchoolId = "550e8400-e29b-41d4-a716-446655440000";
    const requester = {
        id: "user-1",
        schoolId: validSchoolId,
        role: "SCHOOL_ADMIN"
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch finance stats successfully', async () => {
        prisma.school.findUnique.mockResolvedValue({ id: validSchoolId, name: "Test School" });
        prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
        prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 200 } });
        prisma.user.groupBy.mockResolvedValue([]);
        prisma.class.findMany.mockResolvedValue([]);

        const stats = await getFinanceStatsService(requester, validSchoolId);
        expect(stats.totalRevenue).toBe(1000);
        expect(stats.totalExpenses).toBe(200);
        expect(stats.netBalance).toBe(800);
    });

    it('should handle unauthorized access', async () => {
        const unauthorizedRequester = { ...requester, schoolId: "other-school" };
        
        await expect(getFinanceStatsService(unauthorizedRequester, validSchoolId))
            .rejects.toThrow("You do not have permission to access this school's finance stats");
    });
});
