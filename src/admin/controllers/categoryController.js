const categoryService = require("../services/categoryService");
const { statusCode } = require("../../config/default.json");


exports.createCategory = async (req) => {
  try {
    return await categoryService.createCategory(req);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};

exports.getAllCategories = async (req) => {
  try {
    return await categoryService.getAllCategories(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};

exports.updateCategory = async (req) => {
  try {
    return await categoryService.updateCategory(req);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};

exports.deleteCategory = async (req) => {
  try {
    return await categoryService.deleteCategory(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};
