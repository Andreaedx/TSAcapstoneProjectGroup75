const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../Config/cloudinary");

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "property-management/profiles",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        resource_type: "image",
    },
});

const profileUpload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error("Only JPEG, PNG and WebP images are allowed")
            );
        }

        cb(null, true);
    },
});

module.exports = profileUpload;
