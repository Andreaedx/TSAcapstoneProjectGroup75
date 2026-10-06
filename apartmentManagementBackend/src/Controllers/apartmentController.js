const mongoose = require("mongoose");
const Apartment = require("../Models/Apartment");
const Property = require("../Models/Property");
const Tenancy = require("../Models/Tenancy");

// @desc    Create apartment
// @route   POST /api/apartments
// @access  Manager
const createApartment = async (req, res) => {
  try {
    const { property, apartmentNumber, type, rentAmount, status, description } =
      req.body;

    // Validate property ID
    if (!property) {
      return res.status(400).json({
        status: "error",
        message: "Property ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(property)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    // Check that property exists
      const existingProperty = await Property.findById(property);
      console.log("PROPERTY MANAGER:", existingProperty.manager.toString());
      console.log("LOGGED-IN USER:", req.user._id.toString());

    if (!existingProperty) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    // Verify manager owns the property
    if (existingProperty.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to add an apartment to this property",
      });
    }

    // Validate required apartment data
    if (!apartmentNumber || !type || rentAmount === undefined) {
      return res.status(400).json({
        status: "error",
        message: "Apartment number, type and rent amount are required",
      });
    }

    // Validate rent amount
    if (typeof rentAmount !== "number" || rentAmount < 0) {
      return res.status(400).json({
        status: "error",
        message: "Rent amount must be a number greater than or equal to 0",
      });
    }

    // Validate status
    const allowedStatuses = ["VACANT", "OCCUPIED", "MAINTENANCE"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid apartment status",
      });
    }

    // Check duplicate apartment number within property
    const existingApartment = await Apartment.findOne({
      property,
      apartmentNumber,
    });

    if (existingApartment) {
      return res.status(409).json({
        status: "error",
        message:
          "An apartment with this number already exists in this property",
      });
    }

    // Create apartment
    const apartment = await Apartment.create({
      property,
      apartmentNumber,
      type,
      rentAmount,
      status,
      description,
    });

    return res.status(201).json({
      status: "success",
      message: "Apartment created successfully",
      data: apartment,
    });
  } catch (error) {
    console.error("Create apartment error:", error);

    return res.status(500).json({
      status: "error",
      message: "Server error while creating apartment",
    });
  }
};

// @desc    Get all accessible apartments
// @route   GET /api/apartments
// @access  Authenticated users
const getApartments = async (req, res) => {
  try {
    const { propertyId, status } = req.query;

    // Validate propertyId if provided
    if (propertyId && !mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    // Validate status if provided
    const allowedStatuses = ["VACANT", "OCCUPIED", "MAINTENANCE"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid apartment status",
      });
    }

    let query = {};

    // Filter by property
    if (propertyId) {
      query.property = propertyId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    /*
     * Managers can only see apartments belonging
     * to properties they own.
     *
     * Tenants can see apartments according to the
     * project's accessible-apartment rules.
     */
    if (req.user.role === "manager") {
      const properties = await Property.find({
        manager: req.user._id,
      }).select("_id");

      const propertyIds = properties.map((property) => property._id);

      query.property = {
        $in: propertyId
          ? propertyIds.filter((id) => id.toString() === propertyId)
          : propertyIds,
      };
    }

    const apartments = await Apartment.find(query)
      .populate("property", "name address city manager")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      count: apartments.length,
      data: apartments,
    });
  } catch (error) {
    console.error("Get apartments error:", error);

    return res.status(500).json({
      status: "error",
      message: "Server error while fetching apartments",
    });
  }
};

// @desc    Get apartment by ID
// @route   GET /api/apartments/:id
// @access  Authenticated users
const getApartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate apartment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid apartment ID",
      });
    }

    const apartment = await Apartment.findById(id).populate(
      "property",
      "name address city manager",
    );

    if (!apartment) {
      return res.status(404).json({
        status: "error",
        message: "Apartment not found",
      });
    }

    // Managers can only access apartments in their properties
    if (
      req.user.role === "manager" &&
      apartment.property.manager.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to view this apartment",
      });
    }

    return res.status(200).json({
      status: "success",
      data: apartment,
    });
  } catch (error) {
    console.error("Get apartment error:", error);

    return res.status(500).json({
      status: "error",
      message: "Server error while fetching apartment",
    });
  }
};

// @desc    Update apartment
// @route   PATCH /api/apartments/:id
// @access  Manager
const updateApartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate apartment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid apartment ID",
      });
    }

    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        status: "error",
        message: "Apartment not found",
      });
    }

    // Find the property
    const property = await Property.findById(apartment.property);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property associated with this apartment was not found",
      });
    }

    // Verify manager ownership
    if (property.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to update this apartment",
      });
    }

    const allowedFields = [
      "apartmentNumber",
      "type",
      "rentAmount",
      "status",
      "description",
    ];

    // Prevent unknown/protected fields
    const receivedFields = Object.keys(req.body);

    const invalidFields = receivedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `These fields cannot be updated: ${invalidFields.join(", ")}`,
      });
    }

    // Validate apartment type
    const allowedTypes = ["1-BEDROOM", "2-BEDROOM", "3-BEDROOM", "4-BEDROOM"];

    if (req.body.type && !allowedTypes.includes(req.body.type)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid apartment type",
      });
    }

    // Validate status
    const allowedStatuses = ["VACANT", "OCCUPIED", "MAINTENANCE"];

    if (req.body.status && !allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid apartment status",
      });
    }

    // Validate rent amount
    if (
      req.body.rentAmount !== undefined &&
      (typeof req.body.rentAmount !== "number" || req.body.rentAmount < 0)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Rent amount must be a number greater than or equal to 0",
      });
    }

    // Check duplicate apartment number
    if (req.body.apartmentNumber) {
      const duplicate = await Apartment.findOne({
        property: apartment.property,
        apartmentNumber: req.body.apartmentNumber,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          status: "error",
          message:
            "Another apartment with this number already exists in this property",
        });
      }
    }

    // Update only permitted fields
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        apartment[field] = req.body[field];
      }
    });

    const updatedApartment = await apartment.save();

    return res.status(200).json({
      status: "success",
      message: "Apartment updated successfully",
      data: updatedApartment,
    });
  } catch (error) {
    console.error("Update apartment error:", error);

    return res.status(500).json({
      status: "error",
      message: "Server error while updating apartment",
    });
  }
};

// @desc    Delete apartment
// @route   DELETE /api/apartments/:id
// @access  Manager
const deleteApartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate apartment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid apartment ID",
      });
    }

    // Find apartment
    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        status: "error",
        message: "Apartment not found",
      });
    }

    // Find the property that owns the apartment
    const property = await Property.findById(apartment.property);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property associated with this apartment was not found",
      });
    }

    // Check that the logged-in manager owns the property
    if (property.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to delete this apartment",
      });
    }

    // Check for an active tenancy
    const activeTenancy = await Tenancy.findOne({
      apartment: id,
      status: "ACTIVE",
    });

    if (activeTenancy) {
      return res.status(409).json({
        status: "error",
        message: "Cannot delete an apartment with an active tenancy",
      });
    }

    // Delete apartment
    await Apartment.findByIdAndDelete(id);

    return res.status(200).json({
      status: "success",
      message: "Apartment deleted successfully",
    });
  } catch (error) {
    console.error("Delete apartment error:", error);

    return res.status(500).json({
      status: "error",
      message: "Server error while deleting apartment",
    });
  }
};

module.exports = {
  createApartment,
  getApartments,
  getApartmentById,
  updateApartment,
  deleteApartment,
};
