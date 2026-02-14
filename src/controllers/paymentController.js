const { updateStudentDiscountService } = require("../services/paymentService");


/**
 * @description Update student discount
 * @route PUT /api/payments/discount/:studentId
 * @method PUT
 * @access private (Accountant or School Admin)
 */
exports.updateStudentDiscountController = async (req, res) => {
    try {
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
    } catch (error) {
        res.status(error.statusCode || 500).json({
            status: "ERROR",
            message: error.message || "Internal server error"
        });
    }
};