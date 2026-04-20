const {
    getAllUsersService,
    updateUserService,
    deleteUserService
} = require('../src/services/superAdminUserService');
const prisma = require('../src/utils/prisma');
const { hashPassword } = require('../src/utils/auth');

jest.mock('../src/utils/prisma', () => ({
    user: {
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
    }
}));

jest.mock('../src/utils/auth', () => ({
    hashPassword: jest.fn(),
}));

describe('Super Admin User Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllUsersService', () => {
        it('should return paginated users without filters', async () => {
            const page = 1;
            const limit = 10;
            const searchWord = '';
            const roleFilter = '';

            prisma.user.findMany.mockResolvedValue([
                { id: 1, firstName: 'A', lastName: 'B', role: 'SUPER_ADMIN', ownedSchool: { name: 'School 1' } },
                { id: 2, firstName: 'C', lastName: 'D', role: 'SCHOOL_ADMIN', school: { name: 'School 2' } }
            ]);
            prisma.user.count.mockResolvedValue(2);

            const result = await getAllUsersService(page, limit, searchWord, roleFilter);

            expect(result.users.length).toBe(2);
            expect(result.users[0].schoolName).toBe('School 1');
            expect(result.users[1].schoolName).toBe('School 2');
            expect(result.totalUsers).toBe(2);
            expect(prisma.user.findMany).toHaveBeenCalled();
        });

        it('should apply search and role filters', async () => {
            const page = 1;
            const limit = 10;
            const searchWord = 'test';
            const roleFilter = 'STUDENT';

            prisma.user.findMany.mockResolvedValue([]);
            prisma.user.count.mockResolvedValue(0);

            await getAllUsersService(page, limit, searchWord, roleFilter);

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        role: 'STUDENT',
                        OR: expect.any(Array)
                    })
                })
            );
        });
    });

    describe('updateUserService', () => {
        it('should hash password and update user', async () => {
            const userId = 1;
            const updateData = { firstName: 'New', password: 'newpassword' };
            const hashedPassword = 'hashedpassword123';

            hashPassword.mockResolvedValue(hashedPassword);
            prisma.user.update.mockResolvedValue({
                id: userId,
                firstName: 'New',
                role: 'TEACHER',
                school: { name: 'School' }
            });

            const result = await updateUserService(userId, updateData);

            expect(hashPassword).toHaveBeenCalledWith('newpassword');
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: { firstName: 'New', password: hashedPassword },
                select: expect.any(Object)
            });
            expect(result.schoolName).toBe('School');
        });

        it('should update without hashing if password not provided', async () => {
            const userId = 1;
            const updateData = { firstName: 'New' };

            prisma.user.update.mockResolvedValue({
                id: userId,
                firstName: 'New',
            });

            await updateUserService(userId, updateData);

            expect(hashPassword).not.toHaveBeenCalled();
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { firstName: 'New' }
            }));
        });
    });

    describe('deleteUserService', () => {
        it('should soft delete user', async () => {
            const userId = 1;

            prisma.user.update.mockResolvedValue({ id: userId, isDeleted: true });

            await deleteUserService(userId);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: { isDeleted: true, deletedAt: expect.any(Date) }
            });
        });
    });
});
