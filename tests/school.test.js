const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('School System Tests', () => {

    // Test School Admin data (will create and own the school)
    const testSchoolAdmin = {
        firstName: "Test",
        lastName: "SchoolAdmin",
        email: "test_schooladmin_jest@example.com",
        password: "TestPassword123",
        phone: "0771234567",
        gender: "MALE",
        birthDate: new Date("1990-01-01"),
        role: "SCHOOL_ADMIN"
    };

    // Test Super Admin data (for getting all schools)
    const testSuperAdmin = {
        firstName: "Test",
        lastName: "SuperAdmin",
        email: "test_superadmin_school_jest@example.com",
        password: "TestPassword123",
        phone: "0779999999",
        gender: "MALE",
        birthDate: new Date("1985-01-01"),
        role: "SUPER_ADMIN"
    };

    // Test School data
    const testSchool = {
        name: "Test School Jest",
        address: "123 Test Street",
        phone: "0771234567"
    };

    // Variables to store tokens and IDs
    let schoolAdminToken = null;
    let superAdminToken = null;
    let createdSchoolId = null;

    // =============== Setup before tests ===============
    beforeAll(async () => {
        // 1. Clean up old data
        await prisma.school.deleteMany({ where: { name: testSchool.name } });
        await prisma.user.deleteMany({ where: { email: testSchoolAdmin.email } });
        await prisma.user.deleteMany({ where: { email: testSuperAdmin.email } });

        // 2. Create School Admin directly in the database
        const hashedPassword = await bcrypt.hash(testSchoolAdmin.password, 10);
        await prisma.user.create({
            data: {
                firstName: testSchoolAdmin.firstName,
                lastName: testSchoolAdmin.lastName,
                email: testSchoolAdmin.email,
                password: hashedPassword,
                phone: testSchoolAdmin.phone,
                gender: testSchoolAdmin.gender,
                birthDate: testSchoolAdmin.birthDate,
                role: testSchoolAdmin.role
            }
        });

        // 3. Create Super Admin directly in the database
        const hashedPasswordSuper = await bcrypt.hash(testSuperAdmin.password, 10);
        await prisma.user.create({
            data: {
                firstName: testSuperAdmin.firstName,
                lastName: testSuperAdmin.lastName,
                email: testSuperAdmin.email,
                password: hashedPasswordSuper,
                phone: testSuperAdmin.phone,
                gender: testSuperAdmin.gender,
                birthDate: testSuperAdmin.birthDate,
                role: testSuperAdmin.role
            }
        });

        // 4. Login School Admin to get token
        const loginSchoolAdmin = await request(app)
            .post('/api/auth/login')
            .send({
                email: testSchoolAdmin.email,
                password: testSchoolAdmin.password
            });
        schoolAdminToken = loginSchoolAdmin.body.userData.token;

        // 5. Login Super Admin to get token
        const loginSuperAdmin = await request(app)
            .post('/api/auth/login')
            .send({
                email: testSuperAdmin.email,
                password: testSuperAdmin.password
            });
        superAdminToken = loginSuperAdmin.body.userData.token;
    });

    // =============== Clean up after tests ===============
    afterAll(async () => {
        // Delete test data and close connection
        await prisma.school.deleteMany({ where: { name: testSchool.name } });
        await prisma.user.deleteMany({ where: { email: testSchoolAdmin.email } });
        await prisma.user.deleteMany({ where: { email: testSuperAdmin.email } });
        await prisma.$disconnect();
    });

    // =============== Create School Tests ===============
    describe('POST /api/schools', () => {

        // Test creating a new school successfully
        it('should create a new school successfully', async () => {
            const res = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(testSchool)
                .expect(201)
                .expect('Content-Type', /json/);

            expect(res.body).toHaveProperty('school');
            expect(res.body.school.name).toEqual(testSchool.name);
            expect(res.body.school).toHaveProperty('slug');

            // Save the school ID for later tests
            createdSchoolId = res.body.school.id;
        });

        // Test creating a school with duplicate name
        it('should fail to create school with duplicate name', async () => {
            const res = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(testSchool)
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });

        // Test creating a school without token
        it('should fail to create school without token', async () => {
            const res = await request(app)
                .post('/api/schools')
                .send(testSchool)
                .expect(401);

            expect(res.body.message).toBeTruthy();
        });

        // Test creating a school without name
        it('should fail validation when name is missing', async () => {
            const res = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ address: "No name school" })
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });
    });

    // =============== Get Schools Tests ===============
    describe('GET /api/schools', () => {

        // Test getting all schools (Super Admin only)
        it('should get all schools successfully as Super Admin', async () => {
            const res = await request(app)
                .get('/api/schools')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .expect(200);

            expect(res.body).toHaveProperty('schools');
            expect(Array.isArray(res.body.schools)).toBe(true);
        });

        // Test getting a school by id (owner can access)
        it('should get school by id successfully', async () => {
            const res = await request(app)
                .get(`/api/schools/${createdSchoolId}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .expect(200);

            expect(res.body).toHaveProperty('school');
            expect(res.body.school.name).toEqual(testSchool.name);
        });

        // Test getting a non-existent school
        it('should return 404 for non-existent school', async () => {
            const fakeId = '1484ed2f-abd3-43ad-a9ea-b6df15d485f8';
            const res = await request(app)
                .get(`/api/schools/${fakeId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .expect(404);

            expect(res.body.message).toMatch(/not found/i);
        });
    });

    // =============== Update School Tests ===============
    describe('PUT /api/schools/:id', () => {

        // Test updating a school successfully (by owner)
        it('should update school successfully', async () => {
            const updatedData = { address: "456 Updated Street" };
            const res = await request(app)
                .put(`/api/schools/${createdSchoolId}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(updatedData)
                .expect(200);

            expect(res.body).toHaveProperty('school');
            expect(res.body.school.address).toEqual("456 Updated Street");
        });
    });

    // =============== Delete School Tests ===============
    describe('DELETE /api/schools/:id', () => {

        // Test deleting a school successfully (by owner)
        it('should delete school successfully', async () => {
            const res = await request(app)
                .delete(`/api/schools/${createdSchoolId}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .expect(200);

            expect(res.body.message).toMatch(/deleted/i);
        });

        // Test deleting a non-existent school
        it('should return 404 when deleting non-existent school', async () => {
            const res = await request(app)
                .delete(`/api/schools/${createdSchoolId}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .expect(404);

            expect(res.body.message).toMatch(/not found/i);
        });
    });
});