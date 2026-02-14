const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

describe('Subscription System Tests', () => {
    // Test Data
    const testSuperAdmin = {
        firstName: "Super",
        lastName: "Admin",
        email: "superadmin_test@example.com",
        password: "Password123",
        gender: "MALE",
        birthDate: new Date("1990-01-01"),
        role: "SUPER_ADMIN"
    };

    const testSchoolOwner = {
        firstName: "School",
        lastName: "Owner",
        email: "owner_test@example.com",
        password: "Password123",
        gender: "MALE",
        birthDate: new Date("1995-01-01"),
        role: "SCHOOL_ADMIN"
    };

    const testPlan = {
        name: "Premium Test Plan",
        description: "A plan for testing subscriptions",
        price: 299,
        maxStudents: 500,
        maxTeachers: 50,
        durationInDays: 30
    };

    const testSchool = {
        name: "Test Academy",
        slug: "test-academy",
        address: "Test Street 123",
        phone: "0770000000"
    };

    let superAdminToken = null;
    let schoolAdminToken = null;
    let planId = null;
    let schoolId = null;
    let subscriptionRequestId = null;

    // =============== Setup before tests ===============
    beforeAll(async () => {
        // 1. Clean up
        await prisma.subscriptionRequest.deleteMany({});
        await prisma.subscription.deleteMany({});
        await prisma.school.deleteMany({ where: { slug: testSchool.slug } });
        await prisma.user.deleteMany({
            where: {
                email: { in: [testSuperAdmin.email, testSchoolOwner.email] }
            }
        });
        await prisma.plan.deleteMany({ where: { name: testPlan.name } });
        await redis.flushall();

        // 2. Create Super Admin
        const hashedSuperPassword = await bcrypt.hash(testSuperAdmin.password, 10);
        await prisma.user.create({
            data: { ...testSuperAdmin, password: hashedSuperPassword }
        });

        // 3. Create School Owner (but without schoolId yet)
        const hashedOwnerPassword = await bcrypt.hash(testSchoolOwner.password, 10);
        const owner = await prisma.user.create({
            data: { ...testSchoolOwner, password: hashedOwnerPassword }
        });

        // 4. Create School
        const school = await prisma.school.create({
            data: { ...testSchool, ownerId: owner.id }
        });
        schoolId = school.id;

        // Link owner to school
        await prisma.user.update({
            where: { id: owner.id },
            data: { schoolId: school.id }
        });

        // 5. Create Plan
        const plan = await prisma.plan.create({ data: testPlan });
        planId = plan.id;

        // 6. Login both to get tokens
        const superLogin = await request(app).post('/api/auth/login').send({
            email: testSuperAdmin.email,
            password: testSuperAdmin.password
        });
        superAdminToken = superLogin.body.userData.token;

        const ownerLogin = await request(app).post('/api/auth/login').send({
            email: testSchoolOwner.email,
            password: testSchoolOwner.password
        });
        schoolAdminToken = ownerLogin.body.userData.token;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await redis.quit();
    });

    // =============== Subscription Requests Tests ===============
    describe('POST /api/subscriptions/request', () => {
        it('should create a subscription request successfully', async () => {
            const res = await request(app)
                .post('/api/subscriptions/request')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    planId,
                    paymentReceipt: "https://example.com/receipt.jpg"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("PENDING");
            subscriptionRequestId = res.body.data.id;
        });

        it('should fail if a pending request already exists', async () => {
            const res = await request(app)
                .post('/api/subscriptions/request')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ planId });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already have a pending/i);
        });
    });
    // =============== GET /api/subscriptions/requests Tests ===============
    describe('GET /api/subscriptions/requests', () => {
        it('should allow Super Admin to get all requests', async () => {
            const res = await request(app)
                .get('/api/subscriptions/requests')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.count).toBeGreaterThan(0);
        });

        it('should allow filtering by status', async () => {
            const res = await request(app)
                .get('/api/subscriptions/requests?status=PENDING')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.every(r => r.status === 'PENDING')).toBe(true);
        });

        it('should fail for non-Super Admin', async () => {
            const res = await request(app)
                .get('/api/subscriptions/requests')
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.status).toBe(403);
        });
    });
    // =============== GET /api/subscriptions/requests/count Tests ===============
    describe('GET /api/subscriptions/requests/count', () => {
        it('should return the correct count of pending requests', async () => {
            const res = await request(app)
                .get('/api/subscriptions/requests/count')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.count).toBeGreaterThan(0);
        });
    });
    // =============== POST /api/subscriptions/approve/:id Tests ===============
    describe('POST /api/subscriptions/approve/:id', () => {
        it('should approve a subscription request and create subscription', async () => {
            const res = await request(app)
                .post(`/api/subscriptions/approve/${subscriptionRequestId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ adminNotes: "Approved by test" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.updatedRequest.status).toBe("APPROVED");

            // Verify subscription exists in DB
            const subscription = await prisma.subscription.findUnique({
                where: { schoolId }
            });
            expect(subscription).toBeTruthy();
            expect(subscription.status).toBe("ACTIVE");
        });

        it('should fail to approve an already approved request', async () => {
            const res = await request(app)
                .post(`/api/subscriptions/approve/${subscriptionRequestId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already approved/i);
        });
    });
    // =============== POST /api/subscriptions/reject/:id Tests ===============
    describe('POST /api/subscriptions/reject/:id', () => {
        let secondRequestId = null;

        beforeAll(async () => {
            // Create another request to test rejection
            const res = await prisma.subscriptionRequest.create({
                data: {
                    schoolId,
                    planId,
                    status: "PENDING"
                }
            });
            secondRequestId = res.id;
        });

        it('should reject a subscription request', async () => {
            const res = await request(app)
                .post(`/api/subscriptions/reject/${secondRequestId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ adminNotes: "Invalid receipt" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("REJECTED");
        });

        it('should fail if rejection reason is missing', async () => {
            const res = await prisma.subscriptionRequest.create({
                data: { schoolId, planId, status: "PENDING" }
            });

            const rejectRes = await request(app)
                .post(`/api/subscriptions/reject/${res.id}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({}); // adminNotes is required for rejection in validation

            expect(rejectRes.status).toBe(400);
        });
    });
});
