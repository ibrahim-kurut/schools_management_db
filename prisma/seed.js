const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء عملية الـ Seeding...');

  // جلب البيانات من ملف .env لضمان المرونة
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@eduflow.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123456';

  console.log(`🔍 سيتم استخدام البريد: ${adminEmail}`);

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      gender: 'MALE',
      birthDate: new Date('1970-01-01'),
    },
  });

  console.log('✅ تم إنشاء/تحديث المستخدم بنجاح:');
  console.log(`📧 الإيميل: ${admin.email}`);
  console.log(`🔑 الدور: ${admin.role}`);
}

main()
  .catch((e) => {
    console.error('❌ حدث خطأ أثناء عملية الـ Seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 تم إغلاق اتصال قاعدة البيانات.');
  });
