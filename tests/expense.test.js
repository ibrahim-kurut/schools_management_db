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

    describe('GET /api/expenses', () => {
        it('should fetch expenses with pagination', async () => {
            const acc = await prisma.user.findFirst({ where: { role: "ACCOUNTANT", schoolId } });
            // Create some dummy expenses for testing pagination (we have 2 already)
            await prisma.expense.createMany({
                data: Array.from({ length: 3 }, (_, i) => ({
                    title: `Pagination Test Expense ${i + 1}`,
                    amount: 50 + i,
                    type: "OTHER",
                    schoolId: schoolId,
                    recordedById: acc.id
                }))
            });

            const res = await request(app)
                .get('/api/expenses?page=1&limit=2')
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.length).toBe(2);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.total).toBeGreaterThanOrEqual(5);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(2);
        });

        it('should default to page 1 and limit 10 if not provided', async () => {
            const res = await request(app)
                .get('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(10);
        });
    });

    describe('GET /api/expenses/:id', () => {
        it('should successfully fetch an expense by id', async () => {
            const expense = await prisma.expense.findFirst({
                where: { schoolId: schoolId }
            });

            const res = await request(app)
                .get(`/api/expenses/${expense.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.id).toBe(expense.id);
            expect(res.body.data.recipient).toBeDefined();
            expect(res.body.data.recordedBy).toBeDefined();
        });

        it('should return 404 if expense not found', async () => {
            const res = await request(app)
                .get('/api/expenses/00000000-0000-0000-0000-000000000000') // UUID that doesn't exist
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(404);

            expect(res.body.status).toBe("FAIL");
        });

        it('should return 404 if expense belongs to another school', async () => {
            const otherAcc = await prisma.user.findFirst({ where: { schoolId: otherSchoolId } });
            const otherExpense = await prisma.expense.create({
                data: {
                    title: "Other School Expense",
                    amount: 100,
                    type: "OTHER",
                    schoolId: otherSchoolId,
                    recordedById: otherAcc.id
                }
            });

            const res = await request(app)
                .get(`/api/expenses/${otherExpense.id}`)
                .set('Authorization', `Bearer ${accountantToken}`) // Accountant from first school
                .expect(404);
        });
    });

    describe('PUT /api/expenses/:id', () => {
        let testExpense;

        beforeEach(async () => {
            testExpense = await prisma.expense.create({
                data: {
                    title: "Update Test Expense",
                    amount: 500,
                    type: "MAINTENANCE",
                    schoolId: schoolId,
                    recordedById: (await prisma.user.findFirst({ where: { role: "ACCOUNTANT", schoolId } })).id
                }
            });
        });

        it('should successfully update an expense title and amount', async () => {
            const updateData = {
                title: "Updated Title",
                amount: 600
            };

            const res = await request(app)
                .put(`/api/expenses/${testExpense.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(updateData)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.title).toBe(updateData.title);
            expect(res.body.data.amount).toBe(600);
        });

        it('should fail if trying to update an expense to SALARY without recipient', async () => {
            const res = await request(app)
                .put(`/api/expenses/${testExpense.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .send({ type: "SALARY" })
                .expect(500);

            expect(res.body.message).toMatch(/Recipient is required for salary expenses/);
        });

        it('should successfully update to SALARY with valid recipient', async () => {
            const res = await request(app)
                .put(`/api/expenses/${testExpense.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .send({ type: "SALARY", recipientId: teacherId })
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.type).toBe("SALARY");
            expect(res.body.data.recipientId).toBe(teacherId);
        });

        it('should fail if updating from another school', async () => {
            const otherAcc = await prisma.user.findFirst({ where: { schoolId: otherSchoolId } });
            const otherExpense = await prisma.expense.create({
                data: {
                    title: "Other School Expense",
                    amount: 100,
                    type: "OTHER",
                    schoolId: otherSchoolId,
                    recordedById: otherAcc.id
                }
            });

            const res = await request(app)
                .put(`/api/expenses/${otherExpense.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .send({ title: "Hack Attempt" })
                .expect(500);

            expect(res.body.message).toMatch(/You do not have permission to update this expense/);
        });
    });

    describe('DELETE /api/expenses/:id', () => {
        let expenseToDelete;

        beforeEach(async () => {
            expenseToDelete = await prisma.expense.create({
                data: {
                    title: "Expense to Delete",
                    amount: 100,
                    type: "OTHER",
                    schoolId: schoolId,
                    recordedById: (await prisma.user.findFirst({ where: { role: "ACCOUNTANT", schoolId } })).id
                }
            });
        });

        it('should successfully soft delete an expense', async () => {
            const res = await request(app)
                .delete(`/api/expenses/${expenseToDelete.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");

            // Verify it was soft deleted in DB
            const deletedExpense = await prisma.expense.findUnique({
                where: { id: expenseToDelete.id }
            });
            expect(deletedExpense.isDeleted).toBe(true);
        });

        it('should return 404 for an already deleted expense', async () => {
            // First delete it
            await request(app)
                .delete(`/api/expenses/${expenseToDelete.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            // Try to delete again
            const res = await request(app)
                .delete(`/api/expenses/${expenseToDelete.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(500);

            expect(res.body.message).toMatch(/Expense record not found/);
        });

        it('should not return deleted expenses in GET /api/expenses', async () => {
            // First delete it
            await request(app)
                .delete(`/api/expenses/${expenseToDelete.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            // Fetch all
            const res = await request(app)
                .get('/api/expenses')
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            // Verify the deleted expense is not in the list
            const found = res.body.data.find(e => e.id === expenseToDelete.id);
            expect(found).toBeUndefined();
        });

        it('should return 404 when fetching a deleted expense by ID', async () => {
            // First delete it
            await request(app)
                .delete(`/api/expenses/${expenseToDelete.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            // Fetch by ID
            const res = await request(app)
                .get(`/api/expenses/${expenseToDelete.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(404);

            expect(res.body.status).toBe("FAIL");
        });

        it('should fail if deleting from another school', async () => {
            const otherAcc = await prisma.user.findFirst({ where: { schoolId: otherSchoolId } });
            const otherExpense = await prisma.expense.create({
                data: {
                    title: "Other School Expense",
                    amount: 100,
                    type: "OTHER",
                    schoolId: otherSchoolId,
                    recordedById: otherAcc.id
                }
            });

            const res = await request(app)
                .delete(`/api/expenses/${otherExpense.id}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(500);

            expect(res.body.message).toMatch(/You do not have permission to delete this expense/);
        });
    });
});
