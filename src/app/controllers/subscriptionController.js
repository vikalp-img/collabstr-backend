const subscriptionService = require("../services/subscriptionService");
const { statusCode } = require("../../config/default.json");

exports.purchasePlan = async (req) => {
  try {
    const { planId } = req.body;
    const userId = req.user._id;
    return await subscriptionService.purchasePlan(userId, planId);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getUsage = async (req) => {
  try {
    const userId = req.user._id;
    return await subscriptionService.getUsage(userId);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.cancelMySubscription = async (req) => {
  try {
    const userId = req.user._id;
    return await subscriptionService.cancelBrandSubscription(userId);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

