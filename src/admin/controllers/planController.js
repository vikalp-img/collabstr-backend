const planService = require("../services/planService");
const { statusCode } = require("../../config/default.json");

exports.createPlan = async (req) => {
  try {
    return await planService.createPlan(req.body);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getPlans = async (req) => {
  try {
    return await planService.getPlans(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getPlanById = async (req) => {
  try {
    return await planService.getPlanById(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.updatePlan = async (req) => {
  try {
    return await planService.updatePlan(req.params.id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.deletePlan = async (req) => {
  try {
    return await planService.deletePlan(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
