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
router.post("/", protect, authorized("Manager"), createApartment);

// GET APARTMENT BY ID
router.get("/:id", protect, getApartmentById);

// UPDATE APARTMENT
router.patch("/:id", protect, authorized("Manager"), updateApartment);

// DELETE APARTMENT
router.delete("/:id", protect, authorized("Manager"), deleteApartment);

module.exports = router;
