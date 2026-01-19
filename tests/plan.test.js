const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
// Using static fake UUID for testing (valid format, doesn't exist in DB)


describe('Plan System Tests', () => {

    // Test Super Admin data (created directly in DB)
    const testSuperAdmin = {
        firstName: "Test",
        lastName: "SuperAdmin",
        email: "test_superadmin_jest@example.com",
        password: "TestPassword123",
        phone: "0771234567",
        gender: "MALE",
        birthDate: new Date("1990-01-01"),
        role: "SUPER_ADMIN"
    };

    // Test Plan data
    const testPlan = {
        name: "Test Plan Jest",
        description: "This is a test plan created by Jest",
        price: 100,
        maxStudents: 50,
        maxTeachers: 10
    };

    // Variables to store token and plan ID
    let superAdminToken = null;
    let createdPlanId = null;

    // =============== Setup before tests ===============
    beforeAll(async () => {
        // 1. Clean up old data
        await prisma.plan.deleteMany({ where: { name: testPlan.name } });
        await prisma.user.deleteMany({ where: { email: testSuperAdmin.email } });

        // 2. Create Super Admin directly in the database
        const hashedPassword = await bcrypt.hash(testSuperAdmin.password, 10);
        await prisma.user.create({
            data: {
                firstName: testSuperAdmin.firstName,
                lastName: testSuperAdmin.lastName,
                email: testSuperAdmin.email,
                password: hashedPassword,
                phone: testSuperAdmin.phone,
                gender: testSuperAdmin.gender,
                birthDate: testSuperAdmin.birthDate,
                role: testSuperAdmin.role
            }
        });

        // 3. Login to get the token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: testSuperAdmin.email,
                password: testSuperAdmin.password
            });

        superAdminToken = loginRes.body.userData.token;
    });

    // =============== Clean up after tests ===============
    afterAll(async () => {
        // Delete test data and close connection
        await prisma.plan.deleteMany({ where: { name: testPlan.name } });
        await prisma.user.deleteMany({ where: { email: testSuperAdmin.email } });
        await prisma.$disconnect();
    });

    // =============== Create a new Plan Tests ===============
    describe('POST /api/plans', () => {

        // Test creating a new plan
        it('should create a new plan successfully', async () => {
            const res = await request(app)
                .post('/api/plans')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send(testPlan)
                .expect(201)
                .expect('Content-Type', /json/);

            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toMatchObject({
                name: testPlan.name,
                description: testPlan.description,
                price: testPlan.price
            });

            // Save the plan ID for later tests
            createdPlanId = res.body.data.id;
        });

        // Test creating a new plan with same name
        it('should fail to create plan with duplicate name', async () => {
            const res = await request(app)
                .post('/api/plans')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send(testPlan)
                .expect(400);

            expect(res.body.message).toMatch(/already exists/i);
        });

        // Test creating a plan without token
        it('should fail to create plan without token', async () => {
            const res = await request(app)
                .post('/api/plans')
                .send(testPlan)
                .expect(401);

            expect(res.body.message).toBeTruthy();
        });

        // Test creating a plan without name
        it('should fail validation when name is missing', async () => {
            const res = await request(app)
                .post('/api/plans')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ description: "No name plan", price: 50 })
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });
    });

    // =============== Get Plans Tests ===============
    describe('GET /api/plans', () => {

        // Test getting all plans successfully
        it('should get all plans successfully', async () => {
            const res = await request(app)
                .get('/api/plans')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .expect(200);

            expect(res.body).toHaveProperty('plans');
            expect(Array.isArray(res.body.plans)).toBe(true);
        });

        // Test getting a plan by id successfully
        it('should get plan by id successfully', async () => {
            const res = await request(app)
                .get(`/api/plans/${createdPlanId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .expect(200);

            expect(res.body).toHaveProperty('plan');
            expect(res.body.plan.name).toEqual(testPlan.name);
        });

        // Test getting a plan by id that does not exist
        it('should return 404 for non-existent plan', async () => {
            const fakeId = '1484ed2f-abd3-43ad-a9ea-b6df15d485f8';
            const res = await request(app)
                .get(`/api/plans/${fakeId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .expect(404);

            expect(res.body.message).toMatch(/not found/i);
        });
    });

    // =============== Update Plan Tests ===============
    describe('PUT /api/plans/:id', () => {

        // Test updating a plan successfully
        it('should update plan successfully', async () => {
            const updatedData = { price: 150 };
            const res = await request(app)
                .put(`/api/plans/${createdPlanId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send(updatedData)
                .expect(200);

            expect(res.body).toHaveProperty('plan');
            expect(res.body.plan.price).toEqual(150);
        });
    });

    // =============== Delete Plan Tests ===============
    describe('DELETE /api/plans/:id', () => {

        // Test deleting a plan successfully
        it('should delete plan successfully', async () => {
            const res = await request(app)
                .delete(`/api/plans/${createdPlanId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .expect(200);

            expect(res.body.message).toMatch(/deleted/i);
        });

        // Test deleting a non-existent plan
        it('should return 404 when deleting non-existent plan', async () => {
            const res = await request(app)
                .delete(`/api/plans/${createdPlanId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .expect(404);

            expect(res.body.message).toMatch(/not found/i);
        });
    });
});