const services = require("../services/disputeService");
const { statusCode } = require("../../config/default.json");

exports.getAllDisputes = async (req) => {
  try {
    return await services.getAllDisputes(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.resolveDispute = async (req) => {
  try {
    return await services.resolveDispute(req.params.orderId, req.params.itemId, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
