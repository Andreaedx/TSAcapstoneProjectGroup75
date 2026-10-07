const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const cloudinary = require("../Config/cloudinary");



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

exports.getUsers = async (req, res) => {
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

exports.updateUser = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: "Failed to update"
        });
    }
};

exports.deleteUser = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: "Failed to delete user"
        });
    }
};

