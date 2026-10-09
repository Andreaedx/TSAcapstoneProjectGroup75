const { deleteManyFromCloudinary } = require("../Utils/cloudinary");

// Multer uploads files to Cloudinary before the controller runs. If the request then
// fails (validation error, not found, forbidden...), remove those uploads so they
// don't pile up in Cloudinary unused.
const cleanupUploadsOnError = (req, res, next) => {
    res.on("finish", () => {
        if (res.statusCode < 400) return;

        const files = req.files || (req.file ? [req.file] : []);
        const publicIds = files.map((file) => file.filename).filter(Boolean);

        if (publicIds.length > 0) {
            deleteManyFromCloudinary(publicIds).catch((error) => {
                console.error("Failed to clean up uploads after an error:", error.message);
            });
        }
    });

    next();
};

module.exports = { cleanupUploadsOnError };
