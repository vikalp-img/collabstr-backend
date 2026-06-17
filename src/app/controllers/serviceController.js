const serviceService = require("../services/serviceService");
const { statusCode } = require("../../config/default.json");


exports.createService = async (req) => {
  try {
    return await serviceService.createService(req.body, req.user._id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getServices = async (req) => {
  try {
    return await serviceService.getServices(req.query, req.user._id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateService = async (req) => {
  try {
    return await serviceService.updateService(req.params.id, req.body, req.user._id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteService = async (req) => {
  try {
    return await serviceService.deleteService(req.params.id, req.user._id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getAllServices = async (req) => {
  try {
    return await serviceService.getAllServices(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getServiceTypesByPlatform = async (req) => {
  try {
    return await serviceService.getServiceTypesByPlatform(req.params.platformId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};