const express = require("express");
const router = express.Router();

const userController = require("../Controllers/userController");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

const { userLimiter, sensitiveUserLimiter } = require("../Middleware/rateLimiter");

router.get("/profile", protect, authorized("tenant", "manager"), userController.getProfile);
router.patch("/profile", userLimiter, protect, authorized("tenant", "manager"), userController.updateProfile);
router.patch("/password", sensitiveUserLimiter, protect, authorized("tenant", "manager"), userController.changePassword);
router.delete("/delete", sensitiveUserLimiter, protect, authorized("tenant", "manager"), userController.delete);

router.get("/", userLimiter, protect, authorized("admin"), userController.getUsers);
router.get("/:id", userLimiter, protect, authorized("admin"), userController.getUserById);
router.patch("/:id", sensitiveUserLimiter, protect, authorized("admin"), userController.updateUser);
router.delete("/:id", sensitiveUserLimiter, protect, authorized("admin"), userController.deleteUser);


module.exports = router;
