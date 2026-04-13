const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifyToken, authorize } = require('../middleware/verifyToken');

// Optional: protect all these routes for only SUPER_ADMIN
router.use(verifyToken, authorize(['SUPER_ADMIN']));

// Get all Plans
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new Plan
router.post('/', async (req, res) => {
  try {
    const {
      name, description, price, maxStudents, bufferStudents, pricePerExtraStudent,
      hasBasicManagement, hasAttendance, hasSchedules, hasExcelUpload,
      hasFinancials, hasBusSystem, hasMobileApp, hasAiReports,
      supportLevel, maxTeachers, durationInDays
    } = req.body;

    const newPlan = await prisma.plan.create({
      data: {
        name, description, price, maxStudents, bufferStudents, pricePerExtraStudent,
        hasBasicManagement, hasAttendance, hasSchedules, hasExcelUpload,
        hasFinancials, hasBusSystem, hasMobileApp, hasAiReports,
        supportLevel, maxTeachers, durationInDays
      }
    });

    res.status(201).json(newPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a Plan
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: updateData
    });

    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a Plan
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.plan.delete({
      where: { id }
    });
    res.json({ message: 'تم حذف الخطة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
