const express = require("express");

const {
  createApartment,
  getApartments,
  getApartmentById,
  updateApartment,
  deleteApartment,
  deleteApartmentImage,
  replaceApartmentImage,
  addApartmentImages
} = require("../Controllers/apartmentController");

const { protect, optionalAuth } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

const upload = require("../Middleware/upload");
const { cleanupUploadsOnError } = require("../Middleware/cleanupUploads");

const router = express.Router();

// GET ALL APARTMENTS
router.get("/", optionalAuth, getApartments);

// CREATE APARTMENT
router.post("/", protect, authorized("manager"), cleanupUploadsOnError, upload.array("images", 10), createApartment);

// GET APARTMENT BY ID
router.get("/:id", optionalAuth, getApartmentById);

// UPDATE APARTMENT
router.patch("/:id", protect, authorized("manager"), updateApartment);

// DELETE APARTMENT
router.delete("/:id", protect, authorized("manager"), deleteApartment);

router.post("/:id/images", protect, authorized("manager"), cleanupUploadsOnError, upload.array("images", 10), addApartmentImages);

router.delete("/:apartmentId/images/:imageId", protect, authorized("manager"), deleteApartmentImage);

router.put("/:apartmentId/images/:imageId", protect, authorized("manager"), cleanupUploadsOnError, upload.single("image"), replaceApartmentImage);


module.exports = router;