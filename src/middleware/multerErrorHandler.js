const multer = require("multer");

/**
 * Express error-handling middleware for Multer upload errors.
 * Must be placed AFTER the route handler in the middleware chain.
 */
module.exports = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message || "File upload error",
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || "An error occurred during upload",
        });
    }
    next();
};
