const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({
            status: "error",
            message: "Not authorized, no token provided!"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if(!user){
            return res.status(401).json({
                status: "error",
                message: "User no longer exist"
            });
        }
        req.user = user;

        return next();
    } catch (error) {
        return res.status(401).json({
            status: "error",
            message: "Not authorized. Invalid or expired token."
        });
    }
};

// For public read-only routes: attaches req.user when a valid token is sent,
// otherwise continues as an anonymous visitor instead of rejecting the request
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }

    try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
            req.user = user;
        }
    } catch {
        // Invalid or expired token: treat as anonymous
    }

    return next();
};

module.exports = { protect, optionalAuth };