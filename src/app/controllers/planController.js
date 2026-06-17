const planService = require("../services/planService");
const { statusCode } = require("../../config/default.json");

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
