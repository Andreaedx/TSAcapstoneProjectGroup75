const Property = require("../Models/Property");

// CREATE PROPERTY
const createProperty = async (req, res, next) => {
    try {
        const { name, address, city, description } = req.body;

        if (!name || !address || !city) {
            return res.status(400).json({
                success: false,
                message: "Name, address and city are required",
                data: null
            });
        }

        const property = await Property.create({
            name,
            address,
            city,
            description,
            manager: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Property created successfully",
            data: property
        });
    } catch (error) {
        next(error);
    }
};

// GET ALL PROPERTIES
const getAllProperties = async (req, res, next) => {
    try {
        const { search, city, page = 1, limit = 10 } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { address: { $regex: search, $options: "i" } },
                { city: { $regex: search, $options: "i" } }
            ];
        }

        if (city) {
            filter.city = { $regex: `^${city}$`, $options: "i" };
        }

        const pageNumber = Math.max(Number(page), 1);
        const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
        const skip = (pageNumber - 1) * limitNumber;

        const [properties, total] = await Promise.all([
            Property.find(filter)
                .populate("manager", "name email role")
                .skip(skip)
                .limit(limitNumber)
                .sort({ createdAt: -1 }),
            Property.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "Properties retrieved successfully",
            data: {
                properties,
                pagination: {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    pages: Math.ceil(total / limitNumber)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET ONE PROPERTY
const getPropertyById = async (req, res, next) => {
    try {
        const property = await Property.findById(req.params.id)
            .populate("manager", "name email role");

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Property retrieved successfully",
            data: property
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE PROPERTY
const updateProperty = async (req, res, next) => {
    try {
        const { manager, ...updates } = req.body;

        const property = await Property.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate("manager", "name email role");

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Property updated successfully",
            data: property
        });
    } catch (error) {
        next(error);
    }
};

// DELETE PROPERTY
const deleteProperty = async (req, res, next) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Property deleted successfully",
            data: null
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
};