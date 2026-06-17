const platformService = require("../services/platformService");
const { statusCode } = require("../../config/default.json");


exports.getPlatforms = async (req) => {
  try {
    return await platformService.getPlatforms();
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
