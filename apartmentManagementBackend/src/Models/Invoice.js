const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
    {
        tenancy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenancy",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        dueDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"],
            default: "UNPAID",
        },
    },
    { timestamps: true }
);

const Invoice = mongoose.model("Invoice", InvoiceSchema);

module.exports = Invoice;