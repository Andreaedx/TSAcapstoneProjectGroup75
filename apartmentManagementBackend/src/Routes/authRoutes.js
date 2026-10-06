const express = require("express");
const router = express.Router();

const authController = require("../Controllers/authController");
const {
    loginLimiter,
    registerLimiter,
    passwordLimiter,
    refreshLimiter,
    verificationLimiter
} = require("../Middleware/rateLimiter");


router.post("/register", registerLimiter, authController.register); 
router.get("/verify-email/:token", verificationLimiter, authController.verifyEmail);

router.post("/login", loginLimiter, authController.login); 
router.post("/logout", authController.logout); 
router.post("/refresh", refreshLimiter, authController.generateRefreshToken);

router.post("/forgot-password", passwordLimiter, authController.forgotPassword); 
router.post("/reset-password/:token", passwordLimiter, authController.resetPassword);

module.exports = router;

module.exports = router;
