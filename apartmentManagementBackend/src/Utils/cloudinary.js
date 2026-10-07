const cloudinary = require("../Config/cloudinary");

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(
      `Failed to delete Cloudinary image: ${publicId}`,
      error
    );

    throw error;
  }
};

const deleteManyFromCloudinary = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) {
    return;
  }

  return Promise.all(
    publicIds.map((publicId) =>
      deleteFromCloudinary(publicId)
    )
  );
};

module.exports = {
  deleteFromCloudinary,
  deleteManyFromCloudinary
};
