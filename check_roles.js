const prisma = require('./src/utils/prisma');

async function check() {
  try {
    const students = await prisma.user.findMany({
      where: { classId: { not: null } },
      select: { role: true, isDeleted: true, email: true }
    });

    console.log('Students in DB Sample:');
    students.slice(0, 5).forEach(s => {
      console.log(` - Email: ${s.email}, Role: ${s.role}, isDeleted: ${s.isDeleted}`);
    });

    const rolesFound = [...new Set(students.map(s => s.role))];
    console.log('\nRoles found in students list:', rolesFound);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
