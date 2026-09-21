const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const protect = async (req, res, next) => {
    const authHeader = req.header.authorization;

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

module.exports = { protect };