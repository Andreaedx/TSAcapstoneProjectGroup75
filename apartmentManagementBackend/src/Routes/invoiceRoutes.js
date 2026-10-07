const express = require("express");

const { protect } = require("../Middleware/authMiddleware");
const { authorized } = require("../Middleware/roleMiddleware");
const { createInvoice, getInvoices, getInvoiceById } = require("../Controllers/invoiceController");

const router = express.Router();

router.use(protect);

router.post("/", authorized("manager"), createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);

module.exports = router;