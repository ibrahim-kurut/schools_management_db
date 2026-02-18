const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('Payment System Tests', () => {

    // Test Data
    const testSchool = {
        name: "Payment Test School",
        slug: "PAY-TEST",
        phone: "0770000000"
    };

    const testSchool2 = {
        name: "Other School",
        slug: "OTHER",
        phone: "0771111111"
    };

    const accountantUser = {
        firstName: "Accountant",
        lastName: "User",
        email: "accountant_test@example.com",
        password: "Password123",
        role: "ACCOUNTANT",
        gender: "MALE",
        birthDate: new Date("1990-01-01")
    };

    const studentUser = {
        firstName: "Student",
        lastName: "One",
        email: "student_one@example.com",
        password: "Password123",
        role: "STUDENT",
        gender: "MALE",
        birthDate: new Date("2010-01-01")
    };

    const otherStudentUser = {
        firstName: "Other",
        lastName: "Student",
        email: "other_student@example.com",
        password: "Password123",
        role: "STUDENT",
        gender: "FEMALE",
        birthDate: new Date("2010-01-01")
    };

    let schoolId;
    let otherSchoolId;
    let accountantToken;
    let studentToken;
    let studentId;
    let otherStudentId;
    let classId;

    // Setup
    beforeAll(async (timeout = 20000) => {
        // Cleanup
        await prisma.payment.deleteMany({});
        await prisma.studentProfile.deleteMany({});
        await prisma.user.deleteMany({ where: { email: { in: [accountantUser.email, studentUser.email, otherStudentUser.email] } } });
        await prisma.class.deleteMany({ where: { schoolId: schoolId } });
        await prisma.school.deleteMany({ where: { name: { in: [testSchool.name, testSchool2.name] } } });

        // Create Schools
        const school1 = await prisma.school.create({
            data: {
                name: testSchool.name,
                slug: testSchool.slug,
                owner: {
                    create: {
                        firstName: "Owner",
                        lastName: "One",
                        email: "owner_pay_1@example.com",
                        password: await bcrypt.hash("Pass", 10),
                        role: "SCHOOL_ADMIN",
                        gender: "MALE",
                        birthDate: new Date()
                    }
                }
            }
        });
        schoolId = school1.id;

        // Create Class with fee
        const testClass = await prisma.class.create({
            data: {
                name: "Grade 10",
                tuitionFee: 2000,
                schoolId: schoolId
            }
        });
        classId = testClass.id;

        const school2 = await prisma.school.create({
            data: {
                name: testSchool2.name,
                slug: testSchool2.slug,
                owner: {
                    create: {
                        firstName: "Owner",
                        lastName: "Two",
                        email: "owner_pay_2@example.com",
                        password: await bcrypt.hash("Pass", 10),
                        role: "SCHOOL_ADMIN",
                        gender: "MALE",
                        birthDate: new Date()
                    }
                }
            }
        });
        otherSchoolId = school2.id;

        // Create Accountant in School 1
        const accountant = await prisma.user.create({
            data: {
                ...accountantUser,
                password: await bcrypt.hash(accountantUser.password, 10),
                schoolId: schoolId
            }
        });

        // Create Student in School 1 with class
        const student = await prisma.user.create({
            data: {
                ...studentUser,
                password: await bcrypt.hash(studentUser.password, 10),
                schoolId: schoolId,
                classId: classId
            }
        });
        studentId = student.id;

        // Create Student in School 2
        const otherStudent = await prisma.user.create({
            data: {
                ...otherStudentUser,
                password: await bcrypt.hash(otherStudentUser.password, 10),
                schoolId: otherSchoolId
            }
        });
        otherStudentId = otherStudent.id;

        // Login Accountant
        const logResAccountant = await request(app)
            .post(`/api/auth/${testSchool.slug}/login`)
            .send({ email: accountantUser.email, password: accountantUser.password });

        accountantToken = logResAccountant.body.userData.token;

        // Login Student
        const logResStudent = await request(app)
            .post(`/api/auth/${testSchool.slug}/login`)
            .send({ email: studentUser.email, password: studentUser.password });

        studentToken = logResStudent.body.userData.token;
    });

    beforeEach(async () => {
        await prisma.payment.deleteMany({});
        await prisma.studentProfile.deleteMany({});
    });

    afterAll(async () => {
        // Cleanup
        await prisma.payment.deleteMany({});
        await prisma.studentProfile.deleteMany({});
        await prisma.user.deleteMany({ where: { email: { in: [accountantUser.email, studentUser.email, otherStudentUser.email, "owner_pay_1@example.com", "owner_pay_2@example.com"] } } });
        await prisma.class.deleteMany({ where: { schoolId: schoolId } });
        await prisma.school.deleteMany({ where: { name: { in: [testSchool.name, testSchool2.name] } } });
        await prisma.$disconnect();
    });

    describe('POST /api/payments', () => {
        it('should create a payment successfully for same school student', async () => {
            const paymentData = {
                studentId: studentId,
                amount: 500,
                paymentType: "TUITION",
                note: "First Installment",
                date: new Date().toISOString()
            };

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(paymentData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data).toHaveProperty("id");
            expect(res.body.data.amount).toBe(500);
            expect(res.body.data.invoiceNumber).toMatch(/^PAY-\d+$/); // First 3 chars of PAY-TEST
            expect(res.body.data.recordedByName).toBe(`${accountantUser.firstName} ${accountantUser.lastName}`);
        });

        it('should default status to COMPLETED if not provided', async () => {
            const paymentData = {
                studentId: studentId,
                amount: 200,
                paymentType: "BOOKS"
            };

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(paymentData)
                .expect(201);

            expect(res.body.data.status).toBe("COMPLETED");
        });

        it('should fail validation when amount is missing', async () => {
            const paymentData = {
                studentId: studentId,
                paymentType: "TUITION"
            };

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(paymentData)
                .expect(400);

            expect(res.body.message).toMatch(/Amount is required/);
        });

        it('should fail if student does not exist', async () => {
            const paymentData = {
                studentId: "00000000-0000-0000-0000-000000000000", // Valid UUID but non-existent
                amount: 100,
                paymentType: "TUITION"
            };

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(paymentData)
                .expect(500); // Service throws Error, usually 500

            // Note: In a real app we might want to map this to 404
        });

        it('should fail if student is in another school', async () => {
            const paymentData = {
                studentId: otherStudentId, // Student from School 2
                amount: 100,
                paymentType: "TUITION"
            };

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${accountantToken}`) // Accountant from School 1
                .send(paymentData)
                .expect(500); // Service throws "Student not found or does not belong..."
        });
    });

    describe('GET /api/payments/financial-record/:studentId', () => {
        it('should accurately calculate financial record with discount and multiple payments', async () => {
            // 1. Add a discount for the student
            await prisma.studentProfile.create({
                data: {
                    userId: studentId,
                    discountAmount: 300,
                    discountNotes: "Excellent student scholarship"
                }
            });

            // 2. Add two tuition payments
            // Payment 1: 500
            await prisma.payment.create({
                data: {
                    studentId,
                    schoolId,
                    amount: 500,
                    paymentType: "TUITION",
                    status: "COMPLETED",
                    recordedById: null // Not needed for this check
                }
            });

            // Payment 2: 200
            await prisma.payment.create({
                data: {
                    studentId,
                    schoolId,
                    amount: 200,
                    paymentType: "TUITION",
                    status: "COMPLETED"
                }
            });

            // 3. Add a non-tuition payment (should not affect balance)
            await prisma.payment.create({
                data: {
                    studentId,
                    schoolId,
                    amount: 150,
                    paymentType: "BOOKS",
                    status: "COMPLETED"
                }
            });

            // Math: 
            // Fee: 2000 (from class)
            // Discount: 300
            // Net Required: 1700
            // Total Tuition Paid: 500 + 200 = 700
            // Remaining: 1000

            const res = await request(app)
                .get(`/api/payments/financial-record/${studentId}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            const summary = res.body.data.summary;
            expect(summary.totalTuitionFee).toBe(2000);
            expect(summary.discountAmount).toBe(300);
            expect(summary.netRequired).toBe(1700);
            expect(summary.totalPaid).toBe(700);
            expect(summary.remainingBalance).toBe(1000);
            expect(res.body.data.paymentHistory.length).toBe(2); // Only TUITION payments
        });

        it('should allow a student to view their own record', async () => {
            const res = await request(app)
                .get(`/api/payments/financial-record/${studentId}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.studentName).toContain(studentUser.firstName);
        });

        it('should deny a student from viewing another student record', async () => {
            // Create another student in same school to test identity check
            const secondStudentInSameSchool = await prisma.user.create({
                data: {
                    firstName: "Second",
                    lastName: "Student",
                    email: "second@example.com",
                    password: "Pass",
                    role: "STUDENT",
                    gender: "FEMALE",
                    birthDate: new Date(),
                    schoolId: schoolId
                }
            });

            const res = await request(app)
                .get(`/api/payments/financial-record/${secondStudentInSameSchool.id}`)
                .set('Authorization', `Bearer ${studentToken}`) // Logged in as first student
                .expect(500); // Service throws "Access denied: You can only view your own..."

            expect(res.body.message).toMatch(/Access denied/);
        });

        it('should fail if student belongs to another school', async () => {
            const res = await request(app)
                .get(`/api/payments/financial-record/${otherStudentId}`)
                .set('Authorization', `Bearer ${accountantToken}`) // School 1 accountant
                .expect(500);

            expect(res.body.message).toMatch(/You do not have permission/);
        });
    });

    describe('PUT /api/payments/:id', () => {
        let paymentToUpdateId;

        beforeEach(async () => {
            const payment = await prisma.payment.create({
                data: {
                    studentId,
                    schoolId,
                    amount: 1000,
                    paymentType: "TUITION",
                    recordedById: null
                }
            });
            paymentToUpdateId = payment.id;
        });

        it('should successfully update a payment', async () => {
            const updateData = {
                amount: 1200,
                note: "Updated note"
            };

            const res = await request(app)
                .put(`/api/payments/${paymentToUpdateId}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .send(updateData)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.amount).toBe(1200);
            expect(res.body.data.note).toBe("Updated note");
        });

        it('should fail if payment is from another school', async () => {
            // Create a payment in school 2
            const otherSchoolPayment = await prisma.payment.create({
                data: {
                    studentId: otherStudentId,
                    schoolId: otherSchoolId,
                    amount: 500,
                    paymentType: "TUITION"
                }
            });

            const res = await request(app)
                .put(`/api/payments/${otherSchoolPayment.id}`)
                .set('Authorization', `Bearer ${accountantToken}`) // School 1 accountant
                .send({ amount: 600 })
                .expect(500);

            expect(res.body.message).toMatch(/You do not have permission/);
        });

        it('should fail validation with invalid amount', async () => {
            const res = await request(app)
                .put(`/api/payments/${paymentToUpdateId}`)
                .set('Authorization', `Bearer ${accountantToken}`)
                .send({ amount: -50 })
                .expect(400);

            expect(res.body.message).toMatch(/Amount must be a positive value/);
        });
    });

});