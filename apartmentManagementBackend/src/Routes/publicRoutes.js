const express = require("express");

const {
  getPublicProperties,
  getPublicPropertyById,
  getPublicPropertyApartments,
} = require("../Controllers/publicController");

const router = express.Router();

// GET ALL PUBLIC PROPERTIES
router.get("/properties", getPublicProperties);

// GET ONE PUBLIC PROPERTY
router.get("/properties/:id", getPublicPropertyById);

// GET AVAILABLE APARTMENTS FOR A PUBLIC PROPERTY
router.get("/properties/:id/apartments", getPublicPropertyApartments);

module.exports = router;