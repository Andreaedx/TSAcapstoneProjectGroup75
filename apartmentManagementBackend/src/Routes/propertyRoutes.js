const express = require("express");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

const upload = require("../Middleware/upload");


// PROPERTY ROUTES
const {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    deletePropertyImage,
    replacePropertyImage
} = require("../Controllers/PropertyController");

const router = express.Router();

router.use(protect);


// Define routes for property management

// CREATE PROPERTY
router.post("/", protect, authorized("manager"), upload.array("images", 10), createProperty);

// GET ALL PROPERTIES
router.get("/", getAllProperties);

// GET PROPERTY BY ID
router.get("/:id", getPropertyById);

// UPDATE PROPERTY
router.put("/:id", authorized("manager"), updateProperty);

// DELETE PROPERTY
router.delete("/:id", authorized("manager", "admin"), deleteProperty);

router.delete("/:propertyId/images/:imageId", protect, authorized("manager"), deletePropertyImage);

router.put("/:propertyId/images/:imageId", protect, authorized("manager"), upload.single("image"), replacePropertyImage);


module.exports = router;