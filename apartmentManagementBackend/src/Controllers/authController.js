const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { generateToken, generateRefreshToken } = require("../Utils/generateToken");
const { sendPasswordResetMail, sendVerificationMail } = require("../Utils/sendMail");

// In production the frontend and API are usually on different domains, so the refresh
// cookie must be sent cross-site (SameSite=None requires Secure). Locally, Strict is fine.
const isProduction = process.env.NODE_ENV === "production";
const refreshCookieOptions = {
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict"
};


exports.register = async (req, res, next) => {
    try {
        const {
            name,
            email,
            password,
            accountType = "tenant"
        } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Input required!"
            });
        }

        if (
            typeof password !== "string" ||
            password.length < 6
        ) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        if (
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        if (!["tenant", "manager"].includes(accountType)) {
            return res.status(400).json({
                success: false,
                message: "accountType must be either tenant or manager"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if the email already exists
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate a cryptographically secure 6-digit OTP
        const oneTimeCode = crypto
            .randomInt(0, 1000000)
            .toString()
            .padStart(6, "0");

        // Hash OTP before saving it to the database
        const hashedOneTimeCode = crypto
            .createHash("sha256")
            .update(oneTimeCode)
            .digest("hex");

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "tenant",

            managerRequest: accountType === "manager"
                ? "PENDING"
                : "NONE",

            isEmailVerified: false,

            emailVerificationToken: hashedOneTimeCode,

            emailVerificationExpires:
                Date.now() + 15 * 60 * 1000
        });

        // Send OTP to user's email
        try {
            await sendVerificationMail(
                user.email,
                oneTimeCode
            );
        } catch (error) {
            console.error("Verification email failed:", error);

            await User.findByIdAndDelete(user._id);

            return res.status(500).json({
                success: false,
                message: "Unable to send verification email. Please try again."
            });
        }

        return res.status(201).json({
            success: true,
            message: accountType === "manager"
                ? "Registration successful. A verification code has been sent to your email. Your manager account is awaiting admin approval."
                : "Registration successful. A verification code has been sent to your email.",
            email: normalizedEmail
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        next(error);
    }
};


exports.verifyEmail = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        // Validate request body
        if (
            typeof email !== "string" ||
            typeof code !== "string" ||
            !/^\d{6}$/.test(code)
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid email and 6-digit verification code are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Explicitly retrieve fields excluded by select: false
        const user = await User.findOne({
            email: normalizedEmail
        }).select(
            "+emailVerificationToken +emailVerificationExpires"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified."
            });
        }

        // Ensure a verification token and expiration exist
        if (
            !user.emailVerificationToken ||
            !user.emailVerificationExpires
        ) {
            return res.status(400).json({
                success: false,
                message: "Verification code is missing or expired. Please request a new code."
            });
        }

        // Convert expiration to milliseconds
        const expiresAt = new Date(
            user.emailVerificationExpires
        ).getTime();

        // Reject invalid or expired dates
        if (
            !Number.isFinite(expiresAt) ||
            expiresAt <= Date.now()
        ) {
            return res.status(400).json({
                success: false,
                message: "Verification code has expired. Please request a new code."
            });
        }

        // Hash the submitted code before comparison
        const hashedCode = crypto
            .createHash("sha256")
            .update(code)
            .digest("hex");

        const storedToken = user.emailVerificationToken;

        // Validate the stored hash format before timing-safe comparison
        if (!/^[a-f0-9]{64}$/i.test(storedToken)) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification token. Please request a new code."
            });
        }

        const isCodeValid = crypto.timingSafeEqual(
            Buffer.from(hashedCode, "hex"),
            Buffer.from(storedToken, "hex")
        );

        if (!isCodeValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification code."
            });
        }

        // Mark email as verified
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully."
        });

    } catch (error) {
        next(error);
    }
};


exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email })
            .select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
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
            ...refreshCookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
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
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const hashedToken = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            await User.findOneAndUpdate(
                { refreshToken: hashedToken },
                { refreshToken: null }
            );
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            ...refreshCookieOptions
        });

        res.status(200).json({
            success: true,
            message: "Logout successfully"
        });

    } catch (error) {
        next(error);
    }
};


exports.generateRefreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token not found"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const user = await User.findOne({
            refreshToken: hashedToken
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        if (decoded.id.toString() !== user.id.toString()) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const token = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        const newHashedRefreshToken = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        user.refreshToken = newHashedRefreshToken;

        await user.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            ...refreshCookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            token
        });

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Refresh token expired. Please login again"
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid refresh token"
        });
    }
};


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

        const resetToken = crypto
            .randomBytes(32)
            .toString("hex");

        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires =
            Date.now() + 15 * 60 * 1000;

        await user.save();

        try {
            await sendPasswordResetMail(
                user.email,
                resetToken
            );
        } catch (error) {
            console.error(
                "Password reset email failed:",
                error
            );

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;

            await user.save();

            return res.status(500).json({
                success: false,
                message: "Unable to send reset password token"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset link will be sent"
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

        if (typeof newPassword !== "string" || newPassword.length < 6) {
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
            resetPasswordExpires: {
                $gt: Date.now()
            }
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