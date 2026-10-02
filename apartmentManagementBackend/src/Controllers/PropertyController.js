const Property = require("../Models/Property");

// CREATE PROPERTY
const createProperty = async (req, res) => {
    const { name, address, city, description, manager } = req.body;

    const property = await Property.create({
        name,
        address,
        city,
        description,
        manager
    });

    res.status(201).json(property);
};

// GET ALL PROPERTIES
const getAllProperties = async (req, res) => {
    const properties = await Property.find();

    res.status(200).json(properties);
};

// GET ONE PROPERTY
const getPropertyById = async (req, res) => {
    const property = await Property.findById(req.params.id);

    if (!property) {
        return res.status(404).json({
            message: "Property not found"
        });
    }

    res.status(200).json(property);
};

// UPDATE PROPERTY
const updateProperty = async (req, res) => {
    const property = await Property.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!property) {
        return res.status(404).json({
            message: "Property not found"
        });
    }

    res.status(200).json(property);
};

// DELETE PROPERTY
const deleteProperty = async (req, res) => {
    const property = await Property.findByIdAndDelete(req.params.id);

    if (!property) {
        return res.status(404).json({
            message: "Property not found"
        });
    }

    res.status(200).json({
        message: "Property deleted successfully"
    });
};

module.exports = {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
};