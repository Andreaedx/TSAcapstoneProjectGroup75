const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        paidAt: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["PENDING", "SUCCESSFUL", "FAILED"],
            default: "PENDING",
        },
        reference: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;