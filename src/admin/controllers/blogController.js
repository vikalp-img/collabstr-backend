const blogService = require("../services/blogService");
const { statusCode } = require("../../config/default.json");


exports.createBlog = async (req) => {
  try {
    return await blogService.createBlog(req.body, req.file);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getAllBlogs = async (req) => {
  try {
    return await blogService.getAllBlogs(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getBlogById = async (req) => {
  try {
    return await blogService.getBlogById(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateBlog = async (req) => {
  try {
    return await blogService.updateBlog(req.params.id, req.body, req.file);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteBlog = async (req) => {
  try {
    return await blogService.deleteBlog(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
