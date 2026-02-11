const { getUserProfileService } = require('../src/services/profileService');
const prisma = require('../src/utils/prisma');

// Mock prisma
jest.mock('../src/utils/prisma', () => ({
    user: {
        findUnique: jest.fn(),
    }
}));

describe('Profile Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserProfileService', () => {
        const userId = 1;

        it('should return student profile', async () => {
            const mockUser = {
                id: userId,
                role: 'STUDENT',
                firstName: 'Student',
                password: 'hashed',
                isDeleted: false,
                gradesAsStudent: [],
                paymentsMade: [],
                salariesReceived: {}, // Should be removed
                subjects: {} // Should be removed
            };
            prisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await getUserProfileService(userId);

            expect(result.status).toBe('SUCCESS');
            expect(result.user).not.toHaveProperty('password');
            expect(result.user).not.toHaveProperty('salariesReceived');
            expect(result.user).toHaveProperty('firstName', 'Student');
        });

        it('should return teacher profile', async () => {
            const mockUser = {
                id: userId,
                role: 'TEACHER',
                firstName: 'Teacher',
                password: 'hashed',
                isDeleted: false,
                gradesAsStudent: {}, // Should be removed
                paymentsMade: {}, // Should be removed
                salariesReceived: [],
                subjects: []
            };
            prisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await getUserProfileService(userId);

            expect(result.status).toBe('SUCCESS');
            expect(result.user).not.toHaveProperty('gradesAsStudent');
            expect(result.user).toHaveProperty('salariesReceived');
        });

        it('should return admin profile', async () => {
            const mockUser = {
                id: userId,
                role: 'SCHOOL_ADMIN',
                firstName: 'Admin',
                isDeleted: false,
            };
            prisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await getUserProfileService(userId);
            expect(result.status).toBe('SUCCESS');
        });

        it('should throw error if user not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(getUserProfileService(userId))
                .rejects.toHaveProperty('statusCode', 404);
        });

        it('should throw error if user is deleted', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: userId, isDeleted: true });

            await expect(getUserProfileService(userId))
                .rejects.toHaveProperty('statusCode', 403);
        });
    });
});
