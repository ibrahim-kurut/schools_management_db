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
    let studentId;
    let otherStudentId;

    // Setup
    beforeAll(async () => {
        // Cleanup
        await prisma.payment.deleteMany({});
        await prisma.user.deleteMany({ where: { email: { in: [accountantUser.email, studentUser.email, otherStudentUser.email] } } });
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

        // Create Student in School 1
        const student = await prisma.user.create({
            data: {
                ...studentUser,
                password: await bcrypt.hash(studentUser.password, 10),
                schoolId: schoolId
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
        const logRes = await request(app)
            .post(`/api/auth/${testSchool.slug}/login`)
            .send({ email: accountantUser.email, password: accountantUser.password });

        if (!logRes.body.userData) {
            console.error("Login failed:", logRes.body);
            throw new Error("Login failed during test setup");
        }
        accountantToken = logRes.body.userData.token;
    });

    afterAll(async () => {
        // Cleanup
        await prisma.payment.deleteMany({});
        await prisma.user.deleteMany({ where: { email: { in: [accountantUser.email, studentUser.email, otherStudentUser.email, "owner_pay_1@example.com", "owner_pay_2@example.com"] } } });
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

});