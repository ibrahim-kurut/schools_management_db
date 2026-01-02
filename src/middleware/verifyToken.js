const jwt = require('jsonwebtoken');

// check if the token is valid
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: "No token provided, access denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id || !decoded.role) {
            return res.status(401).json({ message: "Invalid token: Missing user data." });
        }
        // console.log("decoded", decoded);

        req.user = {
            id: decoded.id,
            role: decoded.role,
            author: decoded.author,
        };

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token, access denied" });
    }
}

// Check if the user has the required role and is receiving the role in the routes. 
function authorize(roles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied: insufficient permissions" });
        }

        next();
    };
}

// check if the user is super admin
function verifyTokenAndSuperAdmin(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role === "SUPER_ADMIN") {
            next();
        } else {
            return res.status(403).json({ message: "Access denied. SUPER_ADMIN privileges required." });
        }
    });
}

module.exports = {
    verifyToken,
    authorize,
    verifyTokenAndSuperAdmin
};