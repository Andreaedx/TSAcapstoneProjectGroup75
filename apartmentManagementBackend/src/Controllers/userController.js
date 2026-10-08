const mongoose = require("mongoose");
const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const cloudinary = require("../Config/cloudinary");
const { sendManagerRequestDecisionMail } = require("../Utils/sendMail");

const MANAGER_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"];



exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById( req.user.id ).select("-password -refreshToken");

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        next(error);
    }
};

exports.uploadProfilePicture = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Profile picture is required"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Delete old profile picture from Cloudinary
        if (user.profilePicture?.publicId) {
            await cloudinary.uploader.destroy(
                user.profilePicture.publicId
            );
        }

        // Save new profile picture
        user.profilePicture = {
            url: req.file.path,
            publicId: req.file.filename
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            profilePicture: user.profilePicture
        });

    } catch (error) {
        next(error);
    }
};


exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        const user = await User.findById(req.user.id).select("-password -refreshToken");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (name !== undefined) user.name = name;

        if (email !== undefined){
            const existingUser = await User.findOne({
                email,
                _id: { $ne: user._id }
            })

            if(existingUser){
                return res.status(409).json({
                    success: false,
                    message: "Email already in use"
                });
            }

            user.email = email;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile successfully updated",
            user
        });
    } catch (error) {
        next(error);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if(!currentPassword || !newPassword){
            return res.status(400).json({
                message: "current password and new password is required"
            });
        }

        // Same minimum as registration and password reset
        if (typeof newPassword !== "string" || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const user = await User.findById(req.user.id).select("+password");
        if(!user){
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if(!isPasswordValid){
            return res.status(401).json({
                message: "current password id not correct"
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.refreshToken = null;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        next(error);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        await User.findByIdAndDelete(req.user.id);

        res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select("-password -refreshToken").limit(20).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error){
        next(error);
    }
};

exports.getUserById = async (req, res, next) => {
    try {
        const isAdmin = req.user.role === "admin";
        const isOwner = req.user.id.toString() === req.params.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const user = await User.findById(req.params.id).select("-password -refreshToken");

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        next(error);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const { name, email, role } = req.body;

        const user = await User.findById(req.params.id).select("-password -refreshToken");

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if(name !== undefined) user.name = name;
        if(email !== undefined){
            const existingUser = await User.findOne({
                email,
                _id: { $ne: user._id }
            });

            if(existingUser){
                return res.status(409).json({
                    success: false,
                    message: "Email already in use"
                });
            }

            user.email = email;
        }
        if(role !== undefined){
            const allowedRoles = ["manager", "tenant"];
            if(!allowedRoles.includes(role)){
                return res.status(400).json({
                    success: false,
                    message: "Invalid role"
                });
            }

            user.role = role;
        }
        
        const updatedUser = await user.save();

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin: list users who registered as managers, filtered by request status (default PENDING)
exports.getManagerRequests = async (req, res, next) => {
    try {
        const status = req.query.status || "PENDING";

        if (!MANAGER_REQUEST_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `status must be one of: ${MANAGER_REQUEST_STATUSES.join(", ")}`
            });
        }

        const users = await User.find({ managerRequest: status })
            .select("name email role isEmailVerified managerRequest createdAt")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        next(error);
    }
};

// Admin: approve or reject a pending manager request
exports.reviewManagerRequest = async (req, res, next) => {
    try {
        const { action } = req.body || {};

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "action must be either approve or reject"
            });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id"
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.managerRequest !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "This user has no pending manager request"
            });
        }

        if (action === "approve" && !user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: "User must verify their email before they can be approved"
            });
        }

        if (action === "approve") {
            user.role = "manager";
            user.managerRequest = "APPROVED";
        } else {
            user.managerRequest = "REJECTED";
        }

        await user.save();

        // The decision is saved either way; a failed notification email should not undo it
        try {
            await sendManagerRequestDecisionMail(user.email, user.name, action === "approve");
        } catch (error) {
            console.error("Manager request email failed:", error);
        }

        res.status(200).json({
            success: true,
            message: action === "approve" ? "Manager request approved" : "Manager request rejected",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                managerRequest: user.managerRequest
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteUser = async (req, res, next) => {
    try{
        const user = await User.findById(req.params.id)

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

