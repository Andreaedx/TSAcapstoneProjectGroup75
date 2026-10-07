const express = require("express");
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

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

const router = express.Router();

// Apply protection middleware to all property routes below
router.use(protect);

// CREATE PROPERTY (Allows both admin & manager, includes Multer array upload)
router.post("/", authorized("admin", "manager"), upload.array("images", 10), createProperty);

// GET ALL PROPERTIES
router.get("/", getAllProperties);

// GET PROPERTY BY ID
router.get("/:id", getPropertyById);

// UPDATE PROPERTY
router.put("/:id", authorized("admin", "manager"), updateProperty);

// DELETE PROPERTY
router.delete("/:id", authorized("admin", "manager"), deleteProperty);

// DELETE SINGLE PROPERTY IMAGE
router.delete("/:propertyId/images/:imageId", authorized("manager"), deletePropertyImage);

// REPLACE SINGLE PROPERTY IMAGE (Includes Multer single upload)
router.put("/:propertyId/images/:imageId", authorized("manager"), upload.single("image"), replacePropertyImage);

module.exports = router;
