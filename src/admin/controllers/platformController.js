const services = require("../services/platformService");
const { statusCode } = require("../../config/default.json");


exports.createPlatform = async (req) => {
  try {
    return await services.createPlatform(req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getPlatforms = async (req) => {
  try {
    return await services.getPlatforms(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updatePlatform = async (req) => {
  try {
    return await services.updatePlatform(req.body, req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deletePlatform = async (req) => {
  try {
    return await services.deletePlatform(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
