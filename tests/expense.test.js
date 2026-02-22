const request = require('supertest');
const prisma = require('../src/utils/prisma');
const app = require('../src/app');
const { generateToken } = require('../src/utils/auth');

describe('Expense Management System Tests', () => {
    let schoolId, schoolAdminToken, accountantToken, studentToken;
    let teacherId, studentId, otherSchoolId;

    beforeAll(async () => {
        // 1. Setup Schools
        const school = await prisma.school.create({
            data: {
                name: "Expense Test School",
                slug: "expense-test-school",
                owner: {
                    create: {
                        firstName: "Admin",
                        lastName: "Expense",
                        email: "admin@expense.com",
                        password: "hash",
                        gender: "FEMALE",
                        birthDate: new Date(),
                        role: "SCHOOL_ADMIN"
                    }
                }
            }
        });
        schoolId = school.id;

        const otherSchool = await prisma.school.create({
            data: {
                name: "Other School",
                slug: "other-school",
                owner: {
                    create: {
                        firstName: "Other",
                        lastName: "Admin",
                        email: "otheradmin@expense.com",
                        password: "hash",
                        gender: "MALE",
                        birthDate: new Date(),
                        role: "SCHOOL_ADMIN"
                    }
                }
            }
        });
        otherSchoolId = otherSchool.id;

        // 2. Setup Users
        const teacher = await prisma.user.create({
            data: {
                firstName: "Teacher",
                lastName: "User",
                email: "teacher@expense.com",
                password: "hash",
                gender: "MALE",
                birthDate: new Date(),
                role: "TEACHER",
                schoolId: schoolId
            }
        });
        teacherId = teacher.id;

        const student = await prisma.user.create({
            data: {
                firstName: "Student",
                lastName: "User",
                email: "student@expense.com",
                password: "hash",
                gender: "MALE",
                birthDate: new Date(),
                role: "STUDENT",
                schoolId: schoolId
            }
        });
        studentId = student.id;

        const accountant = await prisma.user.create({
            data: {
                firstName: "Accountant",
                lastName: "User",
                email: "accountant@expense.com",
                password: "hash",
                gender: "MALE",
                birthDate: new Date(),
                role: "ACCOUNTANT",
                schoolId: schoolId
            }
        });

        // 3. Generate Tokens
        schoolAdminToken = generateToken({ id: school.ownerId, role: "SCHOOL_ADMIN", schoolId });
        accountantToken = generateToken({ id: accountant.id, role: "ACCOUNTANT", schoolId });
        studentToken = generateToken({ id: studentId, role: "STUDENT", schoolId });
    });

    afterAll(async () => {
        await prisma.expense.deleteMany();
        await prisma.user.deleteMany();
        await prisma.school.deleteMany();
    });

    describe('POST /api/expenses', () => {
        it('should successfully create a general expense (SUPPLIES)', async () => {
            const expenseData = {
                title: "Stationery for office",
                amount: 150.5,
                type: "SUPPLIES"
            };

            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(expenseData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.title).toBe(expenseData.title);
            expect(res.body.data.amount).toBe(150.5);
            expect(res.body.data.recordedById).toBeDefined();
        });

        it('should successfully create a salary expense for a teacher', async () => {
            const expenseData = {
                title: "February Salary - Teacher User",
                amount: 2000,
                type: "SALARY",
                recipientId: teacherId
            };

            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(expenseData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.type).toBe("SALARY");
            expect(res.body.data.recipientId).toBe(teacherId);
        });

        it('should fail if salary recipient is missing', async () => {
            const expenseData = {
                title: "Ghost Salary",
                amount: 1000,
                type: "SALARY"
            };

            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(expenseData)
                .expect(500);

            expect(res.body.message).toMatch(/Recipient is required for salary expenses/);
        });

        it('should fail if salary recipient belongs to another school', async () => {
            // Create a user in another school
            const otherUser = await prisma.user.create({
                data: {
                    firstName: "Other",
                    lastName: "School Teacher",
                    email: "otherteacher@expense.com",
                    password: "hash",
                    gender: "MALE",
                    birthDate: new Date(),
                    role: "TEACHER",
                    schoolId: otherSchoolId
                }
            });

            const expenseData = {
                title: "Illegal Salary Transfer",
                amount: 500,
                type: "SALARY",
                recipientId: otherUser.id
            };

            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`) // School 1 accountant
                .send(expenseData)
                .expect(500);

            expect(res.body.message).toMatch(/Recipient user not found in your school/);
        });

        it('should fail if trying to pay salary to a student', async () => {
            const expenseData = {
                title: "Student Salary (?)",
                amount: 100,
                type: "SALARY",
                recipientId: studentId
            };

            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(expenseData)
                .expect(500);

            expect(res.body.message).toMatch(/Salaries can only be paid to staff members/);
        });

        it('should fail validation with negative amount', async () => {
            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send({
                    title: "Test",
                    amount: -100,
                    type: "OTHER"
                })
                .expect(400);

            expect(res.body.message).toMatch(/Amount must be a positive value/);
        });

        it('should fail if unauthorized role (STUDENT) tries to create expense', async () => {
            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: "Self Payment",
                    amount: 100,
                    type: "OTHER"
                })
                .expect(403);
        });
    });
});
