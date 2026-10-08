const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { generateToken, generateRefreshToken } = require("../Utils/generateToken");
const { sendPasswordResetMail, sendVerificationMail } = require("../Utils/sendMail");


exports.register = async (req, res, next) => {
    try {
        const { name, email, password, accountType = "tenant" } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Input required!"
            });
        }

        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Everyone starts as a tenant; choosing "manager" only files a request for admin approval
        if (!["tenant", "manager"].includes(accountType)) {
            return res.status(400).json({
                success: false,
                message: "accountType must be either tenant or manager"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: `User with this ${email} already exists.`
            });
        }

        const salt = await bcrypt.genSalt(10);

        const hashedpassword = await bcrypt.hash(password, salt);

        const verificationToken = crypto.randomBytes(32).toString("hex");

        const hashedVerificationToken = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        const user = await User.create({
            name,
            email,
            password: hashedpassword,
            role: "tenant",
            managerRequest: accountType === "manager" ? "PENDING" : "NONE",
            isEmailVerified: false,
            emailVerificationToken: hashedVerificationToken,
            emailVerificationExpires: Date.now() + 15 * 60 * 1000
        });

        try {
            await sendVerificationMail(
                user.email,
                verificationToken
            );
        } catch (error) {
            console.error("Verification email failed:", error);

            await User.findByIdAndDelete(user._id);

            return res.status(500).json({
                success: false,
                message: "Unable to send verification email"
            });
        }

        return res.status(201).json({
            success: true,
            message: accountType === "manager"
                ? "Registration successful. Please check your email to verify your account. Your manager account is awaiting admin approval."
                : "Registration successful. Please check your email to verify your account."
        });

    } catch (error) {
        next(error);
    }
};


exports.login = async (req, res, next) => {
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

        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in."
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
                role: user.role,
                managerRequest: user.managerRequest,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.logout = async (req, res, next) => {
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
        next(error);
    }
}

exports.generateRefreshToken = async (req, res, next) => {
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

        await user.save();

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
        return res.status(401).json({
            success: false,
            message: "Invalid refresh token"
        });
    }
}

exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: "Password reset link will be sent"
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

        user.resetPasswordToken = hashedToken;

        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        try {
            await sendPasswordResetMail(user.email, resetToken);
        } catch(error){
            console.error("password reset email failed: ", error);

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;

            await user.save();

            return res.status(500).json({
                success: false,
                message: "Unable to send reset password token"
            })
        }

        return res.status(200).json({
            success: true,
            message: "password reset link will be sent"
        });

    } catch (error) {
        next(error);
    }
};


exports.resetPassword = async (req, res, next) => {
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

        const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

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

        const salt = await bcrypt.genSalt(10);

        user.password = await bcrypt.hash(
            newPassword,
            salt
        );

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        user.refreshToken = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please login again"
        });

    } catch (error) {
        next(error);
    }
};

exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is required"
            });
        }

        const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        }).select("+emailVerificationToken");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification token"
            });
        }

        user.isEmailVerified = true;

        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now login."
        });

    } catch (error) {
        next(error);
    }
};
