const authorized = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user?.role?.toLowerCase();

        if (!userRole || !roles.some((role) => role.toLowerCase() === userRole)) {
            return res.status(403).json({
                message: "You do not have permission to perform this action"
            });
        }
        next();
    };
};

module.exports = { authorized };