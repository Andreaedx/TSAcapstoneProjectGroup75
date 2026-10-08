const mongoose = require("mongoose");

const Property = require("../Models/Property");
const Apartment = require("../Models/Apartment");

// Escape regex special characters so user input is matched literally
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET PUBLIC PROPERTIES
 *
 * @route   GET /api/public/properties
 * @access  Public
 *
 * Optional query parameters:
 * - search
 * - city
 * - page
 * - limit
 */
const getPublicProperties = async (req, res, next) => {
  try {
    const {
      search,
      city,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // Search by property name, address or city
    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          address: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          city: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    // Filter by city
    if (city) {
      filter.city = {
        $regex: `^${escapeRegex(city)}$`,
        $options: "i",
      };
    }

    // Pagination
    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      50
    );

    const skip = (pageNumber - 1) * limitNumber;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .select("name address city description images")
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 })
        .lean(),

      Property.countDocuments(filter),
    ]);

    // Only expose image URLs publicly
    const publicProperties = properties.map((property) => ({
      _id: property._id,
      name: property.name,
      address: property.address,
      city: property.city,
      description: property.description,
      images: (property.images || []).map((image) => ({
        url: image.url,
      })),
    }));

    return res.status(200).json({
      success: true,
      message: "Public properties retrieved successfully",
      data: {
        properties: publicProperties,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET PUBLIC PROPERTY BY ID
 *
 * @route   GET /api/public/properties/:id
 * @access  Public
 */
const getPublicPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID",
        data: null,
      });
    }

    const property = await Property.findById(id)
      .select("name address city description images")
      .lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    const publicProperty = {
      _id: property._id,
      name: property.name,
      address: property.address,
      city: property.city,
      description: property.description,
      images: (property.images || []).map((image) => ({
        url: image.url,
      })),
    };

    return res.status(200).json({
      success: true,
      message: "Public property retrieved successfully",
      data: publicProperty,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET PUBLIC PROPERTY APARTMENTS
 *
 * @route   GET /api/public/properties/:id/apartments
 * @access  Public
 *
 * By default, only VACANT apartments are returned.
 *
 * Optional query parameters:
 * - status
 * - type
 * - page
 * - limit
 */
const getPublicPropertyApartments = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate property ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID",
        data: null,
      });
    }

    // Check that property exists
    const property = await Property.findById(id)
      .select("name address city description images")
      .lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    const {
      status = "VACANT",
      type,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate status
    const allowedStatuses = [
      "VACANT",
      "OCCUPIED",
      "MAINTENANCE",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid apartment status",
        data: null,
      });
    }

    // Validate apartment type if supplied
    const allowedTypes = [
      "1-BEDROOM",
      "2-BEDROOM",
      "3-BEDROOM",
      "4-BEDROOM",
    ];

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid apartment type",
        data: null,
      });
    }

    const filter = {
      property: id,
      status,
    };

    if (type) {
      filter.type = type;
    }

    // Pagination
    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      50
    );

    const skip = (pageNumber - 1) * limitNumber;

    const [apartments, total] = await Promise.all([
      Apartment.find(filter)
        .select(
          "apartmentNumber type rentAmount status description images"
        )
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 })
        .lean(),

      Apartment.countDocuments(filter),
    ]);

    // Only expose image URLs publicly
    const publicApartments = apartments.map((apartment) => ({
      _id: apartment._id,
      apartmentNumber: apartment.apartmentNumber,
      type: apartment.type,
      rentAmount: apartment.rentAmount,
      status: apartment.status,
      description: apartment.description,
      images: (apartment.images || []).map((image) => ({
        url: image.url,
      })),
    }));

    return res.status(200).json({
      success: true,
      message: "Available apartments retrieved successfully",
      data: {
        property: {
          _id: property._id,
          name: property.name,
          address: property.address,
          city: property.city,
        },

        apartments: publicApartments,

        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicProperties,
  getPublicPropertyById,
  getPublicPropertyApartments,
};