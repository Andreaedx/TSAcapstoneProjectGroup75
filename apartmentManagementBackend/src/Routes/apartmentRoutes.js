const express = require("express");

const {
  createApartment,
  getApartments,
  getApartmentById,
  updateApartment,
  deleteApartment,
} = require("../Controllers/apartmentController");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");

const router = express.Router();

// GET ALL APARTMENTS
router.get("/", protect, getApartments);

// CREATE APARTMENT
router.post("/", protect, authorized("manager"), createApartment);

// GET APARTMENT BY ID
router.get("/:id", protect, getApartmentById);

// UPDATE APARTMENT
router.patch("/:id", protect, authorized("manager"), updateApartment);

// DELETE APARTMENT
router.delete("/:id", protect, authorized("manager"), deleteApartment);

module.exports = router;
