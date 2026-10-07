const express = require("express");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");
const { createPayment, getPayments, getPaymentById } = require("../Controllers/paymentController");

const router = express.Router();

router.use(protect);

router.post("/", authorized("tenant"), createPayment);
router.get("/", authorized("tenant", "manager"), getPayments);
router.get("/:id", authorized("tenant", "manager"), getPaymentById);

module.exports = router;
