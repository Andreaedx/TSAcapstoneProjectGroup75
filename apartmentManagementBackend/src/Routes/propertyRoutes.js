const express = require("express");
const upload = require("../Middleware/upload");
const { cleanupUploadsOnError } = require("../Middleware/cleanupUploads");

// PROPERTY ROUTES
const {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    deletePropertyImage,
    replacePropertyImage,
    addPropertyImages
} = require("../Controllers/PropertyController");

const { protect, optionalAuth } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

const router = express.Router();

// GET ALL PROPERTIES (public, so visitors can browse listings)
router.get("/", optionalAuth, getAllProperties);

// GET PROPERTY BY ID (public)
router.get("/:id", optionalAuth, getPropertyById);

// Apply protection middleware to all property routes below
router.use(protect);

// CREATE PROPERTY (Allows both admin & manager, includes Multer array upload)
router.post("/", authorized("admin", "manager"), cleanupUploadsOnError, upload.array("images", 10), createProperty);

// UPDATE PROPERTY
router.put("/:id", authorized("admin", "manager"), updateProperty);

// DELETE PROPERTY
router.delete("/:id", authorized("admin", "manager"), deleteProperty);

// ADD IMAGES TO A PROPERTY (Includes Multer array upload)
router.post("/:id/images", authorized("admin", "manager"), cleanupUploadsOnError, upload.array("images", 10), addPropertyImages);

// DELETE SINGLE PROPERTY IMAGE
router.delete("/:propertyId/images/:imageId", authorized("admin", "manager"), deletePropertyImage);

// REPLACE SINGLE PROPERTY IMAGE (Includes Multer single upload)
router.put("/:propertyId/images/:imageId", authorized("admin", "manager"), cleanupUploadsOnError, upload.single("image"), replacePropertyImage);

module.exports = router;
