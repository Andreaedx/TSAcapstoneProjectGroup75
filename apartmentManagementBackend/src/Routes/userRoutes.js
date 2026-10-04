const express = require("express");
const router = express.Router();

const userController = require("../Controllers/userController");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");


router.get("/profile", protect, authorized("tenant", "manager"), userController.getProfile);
router.patch("/profile", protect, authorized("tenant", "manager"), userController.updateProfile);
router.patch("/password", protect, authorized("tenant", "manager"), userController.changePassword);
router.delete("/delete", protect, authorized("tenant", "manager"), userController.delete);

router.get("/", protect, authorized("admin"), userController.getUsers);
router.get("/:id", protect, authorized("admin"), userController.getUserById);
router.patch("/:id", protect, authorized("admin"), userController.updateUser);
router.delete("/:id", protect, authorized("admin"), userController.deleteUser);

module.exports = router;
