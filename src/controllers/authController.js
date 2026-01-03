const { createUserSchema, loginUserSchema } = require("../utils/authValidate");
const authService = require("../services/authService");

exports.createUser = async (req, res) => {
    try {
        const { error, value } = createUserSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await authService.registerUser(value);

        res.status(201).json({
            message: "User created successfully",
            user
        });

    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

exports.login = async (req, res) => {
    try {
        const { error, value } = loginUserSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { user, token } = await authService.loginUser(value.email, value.password);

        // hide password
        user.password = undefined;


        const userData = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            token,
        }

        res.status(200).json({ message: "Login successful", userData });
    } catch (error) {
        console.error(error);
        if (error.message === "Invalid credentials") {
            return res.status(401).json({ message: error.message });
        }
        res.status(500).json({ message: "Internal Server Error" });
    }
};
