const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        role: {
            type: String,
            required: true,
            enum: ["admin", "manager", "tenant"],
            default: "tenant"
        },
        profilePicture: {
            url: {
                type: String,
                default: null
            },
            publicId: {
                type: String,
                default: null
            }
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationToken: {
            type: String,
            select: false
        },
        emailVerificationExpires: {
            type: Date,
            select: false
        },
        refreshToken: {
            type: String,
            default: null,
        },
        resetPasswordToken: {
            type: String,
            default: null
        },
        resetPasswordExpires: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;