const serviceTypeService = require("../services/serviceTypeService");
const { statusCode } = require("../../config/default.json");


exports.createServiceType = async (req) => {
  try {
    return await serviceTypeService.createServiceType(req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getServiceTypes = async (req) => {
  try {
    return await serviceTypeService.getServiceTypes(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateServiceType = async (req) => {
  try {
    return await serviceTypeService.updateServiceType(req.body, req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteServiceType = async (req) => {
  try {
    return await serviceTypeService.deleteServiceType(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
