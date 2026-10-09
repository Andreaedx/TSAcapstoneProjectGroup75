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

// GET ALL PROPERTIES (public)
router.get("/", optionalAuth, getAllProperties);

// GET PROPERTY BY ID (public)
router.get("/:id", optionalAuth, getPropertyById);

// Apply protection middleware to all routes below
router.use(protect);

// CREATE PROPERTY
router.post(
    "/",
    authorized("admin", "manager"),
    cleanupUploadsOnError,
    upload.array("images", 10),
    createProperty
);

// UPDATE PROPERTY
router.put("/:id", authorized("admin", "manager"), updateProperty);

// DELETE PROPERTY
router.delete("/:id", authorized("admin", "manager"), deleteProperty);

// ADD IMAGES TO A PROPERTY
router.post(
    "/:id/images",
    authorized("admin", "manager"),
    cleanupUploadsOnError,
    upload.array("images", 10),
    addPropertyImages
);

// DELETE SINGLE PROPERTY IMAGE
router.delete(
    "/:propertyId/images/:imageId",
    authorized("admin", "manager"),
    deletePropertyImage
);

// REPLACE SINGLE PROPERTY IMAGE
router.put(
    "/:propertyId/images/:imageId",
    authorized("admin", "manager"),
    cleanupUploadsOnError,
    upload.single("image"),
    replacePropertyImage
);

module.exports = router;