const Property = require("../Models/Property");
const Apartment = require("../Models/Apartment");
const { deleteFromCloudinary, deleteManyFromCloudinary } = require("../Utils/cloudinary");

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
      
        // Safeguard user parsing from the protect middleware
        const manager = req.user ? req.user._id : null;

        const images = req.files ? req.files.map((file) => ({
            url: file.path,
            publicId: file.filename,
        })) : [];

        const property = await Property.create({
            name,
            address,
            city,
            description,
            manager,
            images
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
            filter.\$or = [
                { name: { regex: search, options: "i" } },
                { address: { regex: search, options: "i" } },
                { city: { regex: search, options: "i" } }
            ];
        }

        if (city) {
            filter.city = { \$regex: `^${city}$`, \$options: "i" };
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
        const propertyId = req.params.id;
        const property = await Property.findById(propertyId);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
                data: null
            });
        }
      
        // Find apartments belonging to this property
        const apartments = await Apartment.find({ property: propertyId });

        // Collect all Cloudinary public IDs cleanly
        const propertyImageIds = property.images ? property.images.map((image) => image.publicId).filter(Boolean) : [];
        const apartmentImageIds = apartments ? apartments.flatMap((apartment) => apartment.images ? apartment.images.map((image) => image.publicId).filter(Boolean) : []) : [];

        // Delete files from Cloudinary storage if IDs exist
        if (propertyImageIds.length > 0) await deleteManyFromCloudinary(propertyImageIds);
        if (apartmentImageIds.length > 0) await deleteManyFromCloudinary(apartmentImageIds);

        // Delete relational apartments from database
        await Apartment.deleteMany({ property: propertyId });

        // Delete parent property from database
        await Property.findByIdAndDelete(propertyId);
      
        return res.status(200).json({
            success: true,
            message: "Property and its associated apartments deleted successfully",
            data: null
        });
    } catch (error) {
        next(error);
    }
};

// DELETE PROPERTY IMAGE
const deletePropertyImage = async (req, res) => {
  try {
    const { propertyId, imageId } = req.params;
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    if (property.manager && property.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to modify this property",
      });
    }

    const image = property.images.id(imageId);

    if (!image) {
      return res.status(404).json({
        status: "error",
        message: "Image not found",
      });
    }

    await deleteFromCloudinary(image.publicId);
    image.deleteOne();
    await property.save();

    return res.status(200).json({
      status: "success",
      message: "Image deleted successfully",
      data: property,
    });
  } catch (error) {
    console.error("Delete property image error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while deleting image",
    });
  }
};

// REPLACE PROPERTY IMAGE
const replacePropertyImage = async (req, res) => {
  try {
    const { propertyId, imageId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "New image is required",
      });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    if (property.manager && property.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to modify this property",
      });
    }

    const image = property.images.id(imageId);

    if (!image) {
      return res.status(404).json({
        status: "error",
        message: "Image not found",
      });
    }

    const oldPublicId = image.publicId;

    // Mutler has already handled uploading the fresh file stream to Cloudinary
    image.url = req.file.path;
    image.publicId = req.file.filename;

    await property.save();
    await deleteFromCloudinary(oldPublicId);

    return res.status(200).json({
      status: "success",
      message: "Image replaced successfully",
      data: property,
    });
  } catch (error) {
    console.error("Replace property image error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while replacing image",
    });
  }
};

module.exports = {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    deletePropertyImage,
    replacePropertyImage
};
