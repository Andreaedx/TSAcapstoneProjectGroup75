const express = require("express");
const router = express.Router();

const authController = require("../Controllers/authController");

router.post("/register", authController.register)
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.generateRefreshToken);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;