const express = require("express");

const {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
} = require("../Controllers/PropertyController");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

const router = express.Router();

// GET ALL PROPERTIES
router.get("/", protect, getAllProperties);

// GET PROPERTY BY ID
router.get("/:id", protect, getPropertyById);

// CREATE PROPERTY
router.post("/", protect, authorized("admin", "manager"), createProperty);

// UPDATE PROPERTY
router.put("/:id", protect, authorized("admin", "manager"), updateProperty);

// DELETE PROPERTY
router.delete("/:id", protect, authorized("admin", "manager"), deleteProperty);

module.exports = router;