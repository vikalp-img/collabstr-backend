const cmsService = require("../services/cmsService");
const { statusCode } = require("../../config/default.json");


exports.getCmsContent = async (req) => {
  try {
    const { type } = req.query;
    return await cmsService.getCmsContent(type);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
