const mongoose = require("mongoose");

const apartmentSchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        apartmentNumber: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["1-BEDROOM", "2-BEDROOM", "3-BEDROOM", "4-BEDROOM"],
            required: true,
        },
        rentAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["VACANT", "OCCUPIED", "MAINTENANCE"],
            default: "VACANT",
        },
        description: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

const Apartment = mongoose.model("Apartment", apartmentSchema);

module.exports = Apartment;