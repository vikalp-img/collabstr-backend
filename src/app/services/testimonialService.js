const testimonialModel = require("../../models/testimonialModel");
const { statusCode } = require("../../config/default.json");

exports.getTestimonials = async (req) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const skip = (page - 1) * limit;

    const testimonials = await testimonialModel
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await testimonialModel.countDocuments({});

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Testimonials fetched successfully",
      data: testimonials,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error("❌ Error in getTestimonials (App):", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
