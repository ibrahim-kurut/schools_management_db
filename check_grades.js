const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const grades = await prisma.grade.findMany({
    take: 10,
    include: {
        subject: true,
        academicYear: true
    }
  });
  console.log(JSON.stringify(grades, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
