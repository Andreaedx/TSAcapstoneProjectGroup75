const express = require("express");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");
const {
    createMaintenanceRequest,
    getMaintenanceRequests,
    getMaintenanceRequestById,
    updateMaintenanceRequest,
    updateMaintenanceStatus,
} = require("../Controllers/maintenanceController");

const router = express.Router();

router.use(protect);

router.post("/", authorized("Tenant"), createMaintenanceRequest);
router.get("/", getMaintenanceRequests);
router.get("/:id", getMaintenanceRequestById);
router.patch("/:id", updateMaintenanceRequest);
router.patch("/:id/status", authorized("Manager"), updateMaintenanceStatus);

module.exports = router;
