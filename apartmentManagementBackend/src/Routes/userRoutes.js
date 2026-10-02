const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const { protect } = require("../Middleware/authMiddleware");


router.get("/profile", protect, userController.getProfile);
router.patch("/profile", protect, userController.updateProfile);
router.patch("/password", protect, userController.changedPassword);
router.delete("/delete", protect, userController.delete);

module.exports = router;