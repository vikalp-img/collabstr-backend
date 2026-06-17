const { statusCode } = require("../config/default.json");

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== "brand") {
    return res.status(403).json({
      success: false,
      message: "Only brands can access this resource.",
    });
  }
  next();
};
