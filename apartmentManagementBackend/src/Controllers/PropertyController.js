const Property = require("../Models/Property");
const Apartment = require("../Models/Apartment");

const {
  deleteFromCloudinary,
  deleteManyFromCloudinary,
} = require("../Utils/cloudinary");

// CREATE PROPERTY
const createProperty = async (req, res, next) => {
  try {
    const { name, address, city, description } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({
        success: false,
        message: "Name, address and city are required",
        data: null,
      });
    }

    // Make sure user is authenticated
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const manager = req.user._id;

    const images = req.files
      ? req.files.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }))
      : [];

    const property = await Property.create({
      name,
      address,
      city,
      description,
      manager,
      images,
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL PROPERTIES
const getAllProperties = async (req, res, next) => {
  try {
    const {
      search,
      city,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // Search
    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          address: {
            $regex: search,
            $options: "i",
          },
        },
        {
          city: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Filter by city
    if (city) {
      filter.city = {
        $regex: `^${city}$`,
        $options: "i",
      };
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip = (pageNumber - 1) * limitNumber;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate("manager", "name email role")
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 }),

      Property.countDocuments(filter),
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
          pages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE PROPERTY
const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      "manager",
      "name email role"
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property retrieved successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE PROPERTY
const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    // Authorization
    if (
      !property.manager ||
      !req.user?._id ||
      property.manager.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this property",
        data: null,
      });
    }

    // Prevent manager from being changed through this endpoint
    const {
      manager,
      _id,
      images,
      createdAt,
      updatedAt,
      ...updates
    } = req.body;

    Object.assign(property, updates);

    await property.save();

    await property.populate("manager", "name email role");

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
};


// DELETE PROPERTY
const deleteProperty = async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    // Find property FIRST
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    // Authorization
    if (
      !property.manager ||
      !req.user?._id ||
      property.manager.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this property",
        data: null,
      });
    }

    // Find apartments belonging to this property
    const apartments = await Apartment.find({
      property: propertyId,
    });

    // Collect property image IDs
    const propertyImageIds = (property.images || [])
      .map((image) => image.publicId)
      .filter(Boolean);

    // Collect apartment image IDs
    const apartmentImageIds = apartments.flatMap(
      (apartment) =>
        (apartment.images || [])
          .map((image) => image.publicId)
          .filter(Boolean)
    );

    // Delete Cloudinary property images
    if (propertyImageIds.length > 0) {
      await deleteManyFromCloudinary(propertyImageIds);
    }

    // Delete Cloudinary apartment images
    if (apartmentImageIds.length > 0) {
      await deleteManyFromCloudinary(apartmentImageIds);
    }

    // Delete all apartments
    await Apartment.deleteMany({
      property: propertyId,
    });

    // Delete property
    await Property.findByIdAndDelete(propertyId);

    return res.status(200).json({
      success: true,
      message:
        "Property and its associated apartments deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE PROPERTY IMAGE
const deletePropertyImage = async (req, res, next) => {
  try {
    const { propertyId, imageId } = req.params;

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Authorization
    if (
      !property.manager ||
      !req.user?._id ||
      property.manager.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this property",
      });
    }

    const image = property.images.id(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const publicId = image.publicId;

    // Remove image from database
    image.deleteOne();

    await property.save();

    // Remove image from Cloudinary
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// REPLACE PROPERTY IMAGE
const replacePropertyImage = async (req, res, next) => {
  try {
    const { propertyId, imageId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "New image is required",
      });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Authorization
    if (
      !property.manager ||
      !req.user?._id ||
      property.manager.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this property",
      });
    }

    const image = property.images.id(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const oldPublicId = image.publicId;

    // New image has already been uploaded by multer
    image.url = req.file.path;
    image.publicId = req.file.filename;

    // Save new image information
    await property.save();

    // Delete old image from Cloudinary
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId);
    }

    return res.status(200).json({
      success: true,
      message: "Image replaced successfully",
      data: property,
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
  deleteProperty,
  deletePropertyImage,
  replacePropertyImage,
};
