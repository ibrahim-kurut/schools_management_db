const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PricingService {
  /**
   * Calculates and updates the debt of a school based on their plan limits and actual student count.
   * This should be called after manual student additions or bulk Excel imports.
   * @param {string} schoolId
   * @returns {Promise<Object>} Details about the updated debt
   */
  static async updateSchoolDebt(schoolId) {
    const subscription = await prisma.subscription.findUnique({
      where: { schoolId },
      include: { plan: true }
    });

    if (!subscription) {
      return { warning: 'لا يوجد اشتراك متاح لهذه المدرسة' };
    }

    // Actual student count (excluding deleted ones)
    const studentCount = await prisma.user.count({
      where: { schoolId, role: 'STUDENT', isDeleted: false }
    });

    const { maxStudents, bufferStudents, pricePerExtraStudent } = subscription.plan;
    
    let newDebt = 0;
    
    // Check if the student count exceeds the base + buffer zone
    if (studentCount > (maxStudents + bufferStudents)) {
      const extraStudents = studentCount - (maxStudents + bufferStudents);
      newDebt = extraStudents * Number(pricePerExtraStudent);
    }

    // Update the debt in the database
    await prisma.subscription.update({
      where: { schoolId },
      data: { currentDebt: newDebt }
    });

    return { 
      studentCount, 
      newDebt, 
      maxStudents, 
      bufferStudents,
      isInBufferZone: studentCount > maxStudents && studentCount <= (maxStudents + bufferStudents),
      hasExceededLimit: studentCount > (maxStudents + bufferStudents)
    };
  }
}

module.exports = PricingService;
