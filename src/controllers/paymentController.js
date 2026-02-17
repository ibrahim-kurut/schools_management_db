const { updateStudentDiscountService, createPaymentService } = require("../services/paymentService");
const asyncHandler = require("../utils/asyncHandler");
const { createPaymentSchema } = require("../utils/paymentValidate");


/**
 * @description Update student discount
 * @route PUT /api/payments/discount/:studentId
 * @method PUT
 * @access private (Accountant or School Admin)
 */
exports.updateStudentDiscountController = asyncHandler(async (req, res) => {
    const studentId = req.params.studentId;
    const requesterId = req.user.id;
    const { discountAmount, discountNotes } = req.body;

    const updatedProfile = await updateStudentDiscountService(requesterId, studentId, {
        discountAmount,
        discountNotes
    });

    res.status(200).json({
        status: "SUCCESS",
        message: "Student discount updated successfully",
        data: updatedProfile
    });
});

/**
 * @description Create a new payment
 * @route POST /api/payments
 * @method POST
 * @access private (Accountant)
 */

exports.createPaymentController = asyncHandler(async (req, res) => {
    // 1. Validate Input
    const { error } = createPaymentSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: "FAIL",
            message: error.details[0].message
        });
    }

    const requester = req.user;
    const { studentId, amount, date, paymentType, status, note } = req.body;

    const payment = await createPaymentService(requester, {
        studentId,
        amount,
        date,
        paymentType,
        status,
        note
    });

    res.status(201).json({
        status: "SUCCESS",
        message: "Payment created successfully",
        data: payment
    });
});



