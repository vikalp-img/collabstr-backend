const testimonialModel = require("../../models/testimonialModel");
const { statusCode } = require("../../config/default.json");
const { uploadToCloudinary } = require("../../helpers/uploadToCloudinary");

exports.addTestimonial = async (req) => {
  try {
    const { userName, rating, description } = req.body;
    const file = req.file;

    if (!rating || !description) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Rating and description are required",
      };
    }

    let imageObj = undefined;
    if (file) {
      const result = await uploadToCloudinary(file);
      imageObj = {
        url: result.secure_url || result.url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      };
    }

    const newTestimonial = await testimonialModel.create({
      userName,
      userImage: imageObj,
      rating,
      description,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Testimonial added successfully",
      data: newTestimonial,
    };
  } catch (error) {
    console.error("❌ Error in addTestimonial:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getTestimonials = async (req) => {
  try {
    let { page = 1, limit = 10, search } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let query = {};
    if (search) {
      query.description = { $regex: search, $options: 'i' };
      // Note: Searching by userName would require aggregation or an initial user lookup. 
      // For simplicity, search here is just by description unless complex logic is requested.
    }

    const skip = (page - 1) * limit;

    const testimonials = await testimonialModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await testimonialModel.countDocuments(query);

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
    console.error("❌ Error in getTestimonials:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateTestimonial = async (req) => {
  try {
    const { id } = req.params;
    const { userName, rating, description } = req.body;
    const file = req.file;

    const testimonial = await testimonialModel.findById(id);

    if (!testimonial) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Testimonial not found",
      };
    }

    if (file) {
      const result = await uploadToCloudinary(file);
      testimonial.userImage = {
        url: result.secure_url || result.url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      };
    }

    if (userName) testimonial.userName = userName;
    if (rating) testimonial.rating = rating;
    if (description) testimonial.description = description;

    await testimonial.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Testimonial updated successfully",
      data: testimonial,
    };
  } catch (error) {
    console.error("❌ Error in updateTestimonial:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteTestimonial = async (req) => {
  try {
    const { id } = req.params;

    const testimonial = await testimonialModel.findByIdAndDelete(id);

    if (!testimonial) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Testimonial not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Testimonial deleted successfully",
      data: {},
    };
  } catch (error) {
    console.error("❌ Error in deleteTestimonial:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
