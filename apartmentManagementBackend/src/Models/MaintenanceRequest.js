const mongoose = require("mongoose");

const maintenanceRequestSchema = new mongoose.Schema(
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
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        priority: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            default: "MEDIUM",
        },
        status: {
            type: String,
            enum: ["OPEN", "IN_PROGRESS", "RESOLVED"],
            default: "OPEN",
        },
    },
    { timestamps: true }
);

const Maintenance = mongoose.model("Maintenance", maintenanceRequestSchema);

module.exports = Maintenance;