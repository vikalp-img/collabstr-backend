const services = require("../services/orderService");
const { statusCode } = require("../../config/default.json");

exports.getAllOrders = async (req) => {
  try {
    return await services.getAllOrders(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getOrderDetails = async (req) => {
  try {
    return await services.getOrderDetails(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
