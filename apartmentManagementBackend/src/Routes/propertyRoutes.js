const express = require("express");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

// PROPERTY ROUTES
const {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
} = require("../Controllers/PropertyController");

const router = express.Router();

router.use(protect);


// Define routes for property management

// CREATE PROPERTY
router.post("/", authorized("manager"), createProperty);

// GET ALL PROPERTIES
router.get("/", getAllProperties);

// GET PROPERTY BY ID
router.get("/:id", getPropertyById);

// UPDATE PROPERTY
router.put("/:id", authorized("manager"), updateProperty);

// DELETE PROPERTY
router.delete("/:id", authorized("manager"), deleteProperty);


module.exports = router;