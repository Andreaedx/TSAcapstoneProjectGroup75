const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { generateToken, generateRefreshToken } = require("../Utils/generateToken");


exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if(!name || !email || !password){
            return res.status(400).json({
                success: false,
                message: "Input required!"
            });
        }
        
        const existingUser = await User.findOne({ email });
        if(existingUser){
            return res.status(409).json({
                success: false,
                message: `User with this ${email} already exists.`
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedpassword = await bcrypt.hash(password, salt);

        const user = await User.create(
            {
                name,
                email,
                password: hashedpassword,
                role: "tenant"
            }
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");
        if(!user){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid){
            return res.status(401).json({
                success: false,
                message: "Invalid email and password"
            });
        }
 
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken(user._id);

        const hashedRefreshToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

        user.refreshToken = hashedRefreshToken;

        await user.save();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            token,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
};

exports.logout = async (req, res) => {
    try{
        const refreshToken = req.cookies.refreshToken;

        if(refreshToken){
            const hashedToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex")

            await User.findOneAndUpdate(
                { refreshToken: hashedToken },
                { refreshToken: null }
            );
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        res.status(200).json({
            success: true,
            message: "Logout successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
    }
}

exports.generateRefreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken

        if(!refreshToken){
            return res.status(401).json({
                success: false,
                message: "Refresh token not found"
            });
        }

        const hashedToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

        const user = await User.findOne({ refreshToken: hashedToken });

        if(!user){
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        if(decoded.id.toString() !== user.id.toString()){
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const token = generateToken(user._id);

        const newRefreshToken = generateRefreshToken(user._id)

        const newHashedRefreshToken = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

        user.refreshToken = newHashedRefreshToken;

        await User.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            token
        });

    } catch (error) {
        if(error.name === "TokenExpiredError"){
            return res.status(401).json({
                success: false,
                message: "Refresh token expired. Please login again"
            })
        }
        res.status(401).json({
            success: false,
            message: "Invalid refresh token"
        });
    }
}


exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        // Don't reveal whether an email exists
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account with that email exists, a password reset link will be sent"
            });
        }

        // Generate random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Hash token before storing it
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        user.resetPasswordToken = hashedToken;

        // Token expires in 15 minutes
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        // For development/testing
        console.log("PASSWORD RESET TOKEN:", resetToken);

        return res.status(200).json({
            success: true,
            message: "If an account with that email exists, a password reset link will be sent"
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to process password reset request"
        });
    }
};


exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required"
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password is required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Hash token received from user
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find user with valid, non-expired token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select("+password");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);

        user.password = await bcrypt.hash(
            newPassword,
            salt
        );

        // Invalidate reset token
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        // Invalidate existing sessions
        user.refreshToken = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please login again"
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            success: false,
            message: "Password reset failed"
        });
    }
};