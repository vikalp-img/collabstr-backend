const services = require("../services/brandService");
const { statusCode } = require("../../config/default.json");

exports.getAllBrands = async (req) => {
  try {
    return await services.getAllBrands(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getBrandDetails = async (req) => {
  try {
    return await services.getBrandDetails(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.blockUnblockBrand = async (req) => {
  try {
    return await services.blockUnblockUser(req.params.id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
