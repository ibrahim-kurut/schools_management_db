const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('Auth System Tests', () => {
    const testUser = {
        firstName: "Test",
        lastName: "User",
        email: "test_jest_user@example.com",
        password: "password123",
        phone: "0770000000",
        gender: "MALE",
        birthDate: "1990-01-01"
    };

    let authToken = null; // لحفظ التوكن بعد التسجيل

    // Cleaning before and after tests
    beforeAll(async () => {
        await prisma.user.deleteMany({
            where: { email: testUser.email }
        });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { email: testUser.email }
        });
        await prisma.$disconnect();
    });

    // =============== Testing Registration ===============
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201)
                .expect('Content-Type', /json/);

            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toMatchObject({
                email: testUser.email,
                firstName: testUser.firstName,
                lastName: testUser.lastName
            });
            // Make sure you don't return the password
            expect(res.body.user).not.toHaveProperty('password');
        });

        // Testing registration with existing email
        it('should fail to register with existing email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(400);

            expect(res.body.message).toMatch(/email already exists/i);
        });

        // Testing registration with missing required fields
        it('should fail validation when required fields are missing', async () => {
            const invalidUser = {
                firstName: "Incomplete",
                email: "incomplete@example.com"
                // Missing password, lastName, etc.
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(invalidUser)
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });

        // Testing registration with invalid email format
        it('should fail with invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...testUser, email: 'invalid-email' })
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });
        // Testing registration with weak password
        it('should fail with weak password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    email: 'newuser@example.com',
                    password: '123' // كلمة مرور ضعيفة
                })
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });
    });

    // =============== Testing Login ===============
    describe('POST /api/auth/login', () => {
        it('should login valid user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200)
                .expect('Content-Type', /json/);

            expect(res.body.userData).toHaveProperty('token');
            expect(res.body.userData.token).toBeTruthy();

            // Saving the token for future tests
            authToken = res.body.userData.token;

            // Checking user data
            expect(res.body.userData.email).toEqual(testUser.email);
        });

        // Testing login with wrong password
        it('should fail to login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: "wrong_password"
                })
                .expect(401);

            expect(res.body.message).toEqual("Invalid credentials");
        });

        // Testing login with non-existent email
        it('should fail to login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: "notfound@example.com",
                    password: "password123"
                })
                .expect(401);

            expect(res.body.message).toEqual("Invalid credentials");
        });

        // Testing login with missing email
        it('should fail validation when email is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: "password123" })
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });

        // Testing login with missing password
        it('should fail validation when password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email })
                .expect(400);

            expect(res.body.message).toBeTruthy();
        });
    });


});