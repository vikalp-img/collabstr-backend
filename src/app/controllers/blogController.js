const blogService = require("../services/blogService");
const { statusCode } = require("../../config/default.json");


exports.getBlogs = async (req) => {
  try {
    return await blogService.getBlogs(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getBlogDetails = async (req) => {
  try {
    return await blogService.getBlogDetails(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
