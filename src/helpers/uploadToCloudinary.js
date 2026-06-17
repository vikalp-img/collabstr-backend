const cloudinary = require("../config/cloudinary");
const path = require("path");

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Object} file - The file object from Multer (req.file)
 * @returns {Promise} - Cloudinary upload result
 */
exports.uploadToCloudinary = async (file, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const originalExt = path.extname(file.originalname);
    const fileNameWithExt = `${timestamp}_${randomNumber}${originalExt}`;
    const publicId = resourceType === "raw"
      ? `${timestamp}_${randomNumber}${originalExt}`
      : `${timestamp}_${randomNumber}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "collab",
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
        overwrite: false,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        const format = result.format || (resourceType === "raw" ? "pdf" : "");
        const fileUrl = result.secure_url;
        resolve({
          generated_filename: fileNameWithExt,
          public_id: result.public_id,
          secure_url: result.secure_url,
          url: fileUrl,
          resource_type: resourceType === "auto" ? result.resource_type : resourceType,
        });
      },
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * Deletes a file from Cloudinary given its public_id.
 * @param {String} publicId - The public_id of the file to delete
 * @param {String} resourceType - The resource_type of the file (image, video, raw)
 * @returns {Promise} - Cloudinary deletion result
 */
exports.deleteFromCloudinary = async (publicId, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      },
    );
  });
};