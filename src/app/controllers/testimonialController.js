const service = require("../services/testimonialService");
const { statusCode } = require("../../config/default.json");

exports.getTestimonials = async (req) => {
  try {
    return await service.getTestimonials(req);
  } catch (error) {
    console.error("❌ Error in getTestimonials (App):", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
