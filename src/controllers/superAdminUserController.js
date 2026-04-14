const { getAllUsersService, updateUserService, deleteUserService } = require("../services/superAdminUserService");
const asyncHandler = require("../utils/asyncHandler");
const { validateId } = require("../utils/validateUUID");

/**
 * @description Get all users
 * @route GET /api/admin/users
 * @access private (SUPER_ADMIN)
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const role = req.query.role;

    const { users, totalUsers } = await getAllUsersService(page, limit, search, role);

    res.status(200).json({
        message: "Users fetched successfully",
        users,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(totalUsers / limit),
            hasPreviousPage: page > 1
        }
    });
});

/**
 * @description Update user
 * @route PUT /api/admin/users/:id
 * @access private (SUPER_ADMIN)
 */
exports.updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate ID
    const { error: idError } = validateId(id);
    if (idError) {
        return res.status(400).json({ message: idError.details[0].message });
    }

    const updatedUser = await updateUserService(id, req.body);
    
    res.status(200).json({
        message: "User updated successfully",
        user: updatedUser
    });
});

/**
 * @description Delete user
 * @route DELETE /api/admin/users/:id
 * @access private (SUPER_ADMIN)
 */
exports.deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate ID
    const { error: idError } = validateId(id);
    if (idError) {
        return res.status(400).json({ message: idError.details[0].message });
    }

    await deleteUserService(id);
    
    res.status(200).json({
        message: "User deleted successfully"
    });
});
