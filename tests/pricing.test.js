const PricingService = require('../src/services/pricing.service');

const mockPrisma = {
    subscription: {
        findUnique: jest.fn(),
        update: jest.fn()
    },
    user: {
        count: jest.fn()
    }
};

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma)
}));

describe('Pricing Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('updateSchoolDebt', () => {
        const schoolId = 1;

        it('should return warning if no subscription exists', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue(null);

            const result = await PricingService.updateSchoolDebt(schoolId);

            expect(result.warning).toBe('لا يوجد اشتراك متاح لهذه المدرسة');
        });

        it('should calculate 0 debt if within maxStudents', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({
                plan: { maxStudents: 100, bufferStudents: 10, pricePerExtraStudent: 5 }
            });
            mockPrisma.user.count.mockResolvedValue(90);

            const result = await PricingService.updateSchoolDebt(schoolId);

            expect(result.newDebt).toBe(0);
            expect(result.isInBufferZone).toBe(false);
            expect(result.hasExceededLimit).toBe(false);
            expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
                where: { schoolId },
                data: { currentDebt: 0 }
            });
        });

        it('should calculate 0 debt if in buffer zone', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({
                plan: { maxStudents: 100, bufferStudents: 10, pricePerExtraStudent: 5 }
            });
            // 105 is > 100 but <= 110
            mockPrisma.user.count.mockResolvedValue(105);

            const result = await PricingService.updateSchoolDebt(schoolId);

            expect(result.newDebt).toBe(0);
            expect(result.isInBufferZone).toBe(true);
            expect(result.hasExceededLimit).toBe(false);
            expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
                where: { schoolId },
                data: { currentDebt: 0 }
            });
        });

        it('should calculate positive debt if limit + buffer is exceeded', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({
                plan: { maxStudents: 100, bufferStudents: 10, pricePerExtraStudent: 5 }
            });
            // 115 is > 110, so 5 extra students. 5 * 5 = 25 debt
            mockPrisma.user.count.mockResolvedValue(115);

            const result = await PricingService.updateSchoolDebt(schoolId);

            expect(result.newDebt).toBe(25);
            expect(result.isInBufferZone).toBe(false);
            expect(result.hasExceededLimit).toBe(true);
            expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
                where: { schoolId },
                data: { currentDebt: 25 }
            });
        });
    });
});
