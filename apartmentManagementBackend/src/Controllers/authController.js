const User = require("../Models/User");
const bcrypt = require("bcryptjs");
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

        const user = User.create(
            {
                name,
                email,
                password: hashedpassword,
                role: "Tenant"
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
        res.status(200).json({
            success: false,
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
                message: "Refresh not token found"
            });
        }

        const hashedToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex")

        const user = User.findOne({ refreshToken: hashedToken });

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

        const token = generateToken(user.id);

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