const {
    addMemberService,
    getAllMembersService,
    getMemberByIdService,
    updateMemberByIdService,
    deleteMemberByIdService
} = require('../src/services/schoolUserService');
const prisma = require('../src/utils/prisma');
const { hashPassword } = require('../src/utils/auth');

// Mock prisma and auth utils
jest.mock('../src/utils/prisma', () => ({
    school: {
        findUnique: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
    },
    class: {
        findFirst: jest.fn(),
    }
}));

jest.mock('../src/utils/auth', () => ({
    hashPassword: jest.fn(),
}));

describe('School User Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addMemberService', () => {
        const requesterId = 1;
        const memberData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
            role: 'TEACHER', // or STUDENT
            birthDate: '1990-01-01',
            phone: '1234567890',
            gender: 'MALE'
        };

        it('should add a teacher successfully', async () => {
            prisma.school.findUnique.mockResolvedValue({
                id: 1,
                subscription: { status: 'ACTIVE', plan: { maxTeachers: 10 } }
            });
            prisma.user.count.mockResolvedValue(0);
            prisma.user.findUnique.mockResolvedValue(null); // No existing email
            hashPassword.mockResolvedValue('hashed_password');
            prisma.user.create.mockResolvedValue({ ...memberData, id: 100, schoolId: 1 });

            const result = await addMemberService(requesterId, memberData);

            expect(result).toHaveProperty('email', memberData.email);
            expect(result).not.toHaveProperty('password');
            expect(prisma.user.create).toHaveBeenCalled();
        });

        it('should throw error if plan limit reached', async () => {
            prisma.school.findUnique.mockResolvedValue({
                id: 1,
                subscription: { status: 'ACTIVE', plan: { maxTeachers: 1 } }
            });
            prisma.user.count.mockResolvedValue(1);

            await expect(addMemberService(requesterId, memberData))
                .rejects.toThrow(/Plan limit reached/);
        });
    });

    describe('getAllMembersService', () => {
        const requesterId = 1;

        it('should return members with pagination', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: 1 });
            prisma.user.count.mockResolvedValue(10);
            prisma.user.findMany.mockResolvedValue([{ id: 1 }]);

            const result = await getAllMembersService(requesterId, 1, 10, '', '');
            expect(result.members).toHaveLength(1);
            expect(result.totalMembers).toBe(10);
        });
    });

    describe('getMemberByIdService', () => {
        const ownerId = 1;
        const memberId = 100;

        it('should return member details', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: 1 });
            prisma.user.findUnique.mockResolvedValue({ id: memberId, schoolId: 1 });

            const result = await getMemberByIdService(ownerId, memberId);
            expect(result.id).toBe(memberId);
        });

        it('should throw error if member belongs to another school', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: 1 });
            prisma.user.findUnique.mockResolvedValue({ id: memberId, schoolId: 2 });

            await expect(getMemberByIdService(ownerId, memberId))
                .rejects.toThrow(/Member does not belong to this school/);
        });
    });

    describe('updateMemberByIdService', () => {
        const ownerId = 1;
        const memberId = 100;
        const reqData = { firstName: 'Jane' };

        it('should update member successfully (Owner)', async () => {
            prisma.school.findUnique.mockResolvedValue({
                id: 1,
                members: [{ id: memberId, schoolId: 1 }]
            });
            prisma.user.findUnique.mockResolvedValue({ id: ownerId, role: 'SCHOOL_OWNER' }); // Owner role check - Wait, service checks ownerId role? 
            // Actually service: const requester = await prisma.user.findUnique({ where: { id: ownerId }...
            // If ownerId is effectively the ID of the user calling the service.

            // Let's check service logic:
            // 3. Get the role of the user performing the update (requester)

            prisma.user.update.mockResolvedValue({ id: memberId, ...reqData });

            const result = await updateMemberByIdService(ownerId, memberId, reqData);
            expect(result).toHaveProperty('firstName', 'Jane');
        });
    });

    describe('deleteMemberByIdService', () => {
        const ownerId = 1;
        const memberId = 100;

        it('should soft delete member successfully', async () => {
            prisma.school.findUnique.mockResolvedValue({
                id: 1,
                members: [{ id: memberId }]
            });
            prisma.user.update.mockResolvedValue({ id: memberId, isDeleted: true });

            const result = await deleteMemberByIdService(ownerId, memberId);
            expect(result.isDeleted).toBe(true);
        });
    });
});
