const categoryService = require("../services/categoryService");
const { statusCode } = require("../../config/default.json");


exports.getCategories = async (req) => {
  try {
    return await categoryService.getCategories(req.query.page, req.query.limit, req.query.search);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
