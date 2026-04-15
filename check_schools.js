const prisma = require('./src/utils/prisma');

async function check() {
  try {
    const classes = await prisma.class.findMany({
      where: { isDeleted: false },
      select: { name: true, schoolId: true }
    });

    console.log('Classes School IDs:');
    classes.forEach(c => {
      console.log(` - ${c.name}: ${c.schoolId}`);
    });

    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log('\nSchools in DB:');
    schools.forEach(s => console.log(` - ${s.name} (ID: ${s.id}, Slug: ${s.slug})`));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
