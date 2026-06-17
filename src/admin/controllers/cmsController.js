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

exports.addCmsContent = async (req) => {
  try {
    return await cmsService.addCmsContent(req.user._id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteCmsContent = async (req) => {
  try {
    return await cmsService.deleteCmsContent(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateCmsContent = async (req) => {
  try {
    return await cmsService.updateCmsContent(req.params.id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
