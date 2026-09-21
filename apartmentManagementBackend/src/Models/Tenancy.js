const mongoose = require("mongoose");

const tenancySchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        apartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Apartment",
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        rentAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["PENDING", "ACTIVE", "ENDED", "CANCELLED"],
            default: "PENDING",
        },
    },
    { timestamps: true }
);

const Tenancy = mongoose.model("Tenancy", tenancySchema);

module.exports = Tenancy;