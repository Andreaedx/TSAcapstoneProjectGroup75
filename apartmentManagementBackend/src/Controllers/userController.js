const User = require("../Models/User");
const bcrypt = require("bcryptjs");


exports.getProfile = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.updateProfile = async (req, res) => {
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
            succes: true,
            message: "Profile successfully updated",
            user
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Profile update failed"
        }); 
    }
};

exports.changePassword = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
    }
};

exports.delete = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
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
        res.status(500).json({
            success: false,
            message: "Failed to retrieve users"
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password -refreshToken");

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const allowed = req.user.role === "admin"  || req.user.id.toString() === user.id;
        if(!allowed){
            return res.status(403).json({
                success: false,
                message: "Failed to retrieve user"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve user"
        });
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