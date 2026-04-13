const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to check if a specific feature is enabled in the school's current plan.
 * @param {string} featureName - The name of the feature flag (from Plan model)
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Admin might not have schoolId naturally without passing it, but usually, school user context has it.
      // If SuperAdmin, they bypass. We check if user role is not SUPER_ADMIN
      if (req.user && req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      const schoolId = req.user?.schoolId || req.body.schoolId || req.query.schoolId || req.params.schoolId;

      if (!schoolId) {
         return res.status(400).json({ error: "تعذر التحقق من خطة المدرسة لعدم وجود معرّف المدرسة (School ID)." });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { schoolId },
        include: { plan: true },
      });

      if (!subscription || !subscription.plan[featureName]) {
        return res.status(403).json({
          error: "عذراً، هذه الميزة غير متاحة في خطتك الحالية. يرجى مراجعة إدارة المنصة لترقية الاشتراك."
        });
      }
      
      next();
    } catch (error) {
      console.error(`CheckFeature Middleware Error (${featureName}):`, error);
      next(error);
    }
  };
};

module.exports = requireFeature;
