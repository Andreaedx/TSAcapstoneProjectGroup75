const express = require("express");

// PROPERTY ROUTES
const {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
} = require("../Controllers/PropertyController");

const router = express.Router();

// Define routes for property management

// CREATE PROPERTY
router.post("/", createProperty);

// GET ALL PROPERTIES
router.get("/", getAllProperties);

// GET PROPERTY BY ID
router.get("/:id", getPropertyById);

// UPDATE PROPERTY
router.put("/:id", updateProperty);

// DELETE PROPERTY
router.delete("/:id", deleteProperty);


module.exports = router;