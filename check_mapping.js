const prisma = require('./src/utils/prisma');

async function check() {
  try {
    const classes = await prisma.class.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: {
            students: true
          }
        }
      }
    });

    console.log('Classes and Student Counts:');
    classes.forEach(c => {
      console.log(` - ${c.name} (ID: ${c.id}): ${c._count.students} students`);
    });

    const studentsWithoutClass = await prisma.user.count({
      where: { role: 'STUDENT', classId: null, isDeleted: false }
    });
    console.log(`\nStudents with no class: ${studentsWithoutClass}`);

    const studentsWithClass = await prisma.user.count({
      where: { role: 'STUDENT', classId: { not: null }, isDeleted: false }
    });
    console.log(`Students with a class: ${studentsWithClass}`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
