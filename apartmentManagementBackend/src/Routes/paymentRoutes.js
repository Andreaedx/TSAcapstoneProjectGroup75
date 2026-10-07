const express = require("express");

const { protect } = require("../Middleware/authMiddleware");
const { createPayment, getPayments, getPaymentById } = require("../Controllers/paymentController");

const router = express.Router();

router.use(protect);

router.post("/", createPayment);
router.get("/", getPayments);
router.get("/:id", getPaymentById);

module.exports = router;
