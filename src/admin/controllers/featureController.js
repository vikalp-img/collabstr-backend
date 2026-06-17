const featureService = require("../services/featureService");
const { statusCode } = require("../../config/default.json");

exports.createFeature = async (req) => {
  try {
    return await featureService.createFeature(req.body);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getFeatures = async (req) => {
  try {
    return await featureService.getFeatures(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getFeatureById = async (req) => {
  try {
    return await featureService.getFeatureById(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.updateFeature = async (req) => {
  try {
    return await featureService.updateFeature(req.params.id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteFeature = async (req) => {
  try {
    return await featureService.deleteFeature(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
