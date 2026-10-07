const Property = require("../Models/Property");
const Apartment = require("../Models/Apartment");
const { deleteFromCloudinary, deleteManyFromCloudinary } = require("../Utils/cloudinary");


// CREATE PROPERTY
const createProperty = async (req, res) => {
    const { name, address, city, description, manager } = req.body;

    const images = req.files ? req.files.map((file) => ({
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
        images
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

    // Find apartments belonging to this property
    const apartments = await Apartment.find({
      property: id,
    });

    // Collect all Cloudinary public IDs
    const propertyImageIds = property.images.map(
      (image) => image.publicId
    );

    const apartmentImageIds = apartments.flatMap(
      (apartment) =>
        apartment.images.map((image) => image.publicId)
    );

    // Delete property images
    await deleteManyFromCloudinary(propertyImageIds);

    // Delete apartment images
    await deleteManyFromCloudinary(apartmentImageIds);

    // Delete apartments
    await Apartment.deleteMany({
      property: id,
    });

    // Delete property
    await Property.findByIdAndDelete(id);


    res.status(200).json({
        message: "Property deleted successfully"
    });
};

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

    if (
      property.manager.toString() !==
      req.user._id.toString()
    ) {
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

    if (
      property.manager.toString() !==
      req.user._id.toString()
    ) {
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

    // New image was already uploaded to Cloudinary by multer
    image.url = req.file.path;
    image.publicId = req.file.filename;

    await property.save();

    // Remove old image
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

