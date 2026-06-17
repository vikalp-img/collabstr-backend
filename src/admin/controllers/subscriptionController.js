const adminSubscriptionService = require("../services/subscriptionService");
const { statusCode } = require("../../config/default.json");

/**
 * Get all subscriptions for admin view.
 */
exports.getAllSubscriptions = async (req) => {
  try {
    return await adminSubscriptionService.getAllSubscriptions(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

/**
 * Cancel a specific subscription.
 */
exports.cancelSubscription = async (req) => {
  try {
    const { id } = req.params;
    return await adminSubscriptionService.cancelSubscription(id);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
/**
 * Get all subscriptions for a specific brand.
 */
exports.getSubscriptionsByBrand = async (req) => {
  try {
    const { brandId } = req.params;
    return await adminSubscriptionService.getSubscriptionsByBrand(brandId);
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
