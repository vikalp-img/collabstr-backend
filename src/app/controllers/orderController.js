const orderService = require("../services/orderService");
const { statusCode } = require("../../config/default.json");

exports.placeOrder = async (req) => {
  try {
    const { _id: userId } = req.user;
    return await orderService.placeOrder(userId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getOrders = async (req) => {
  try {
    const { _id: userId, role } = req.user;
    const { page, limit, search, status, startDate, endDate } = req.query;
    return await orderService.getOrders(userId, role, { page, limit, search, status, startDate, endDate });
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getOrderById = async (req) => {
  try {
    const { id: orderId } = req.params;
    const { _id: userId, role } = req.user;
    return await orderService.getOrderById(orderId, userId, role);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateOrderItemStatus = async (req) => {
  try {
    const { orderId, itemId, status, message } = req.body;
    const { _id: creatorId } = req.user;
    return await orderService.updateOrderItemStatus(orderId, itemId, status, creatorId, message);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.refundEscrow = async (req) => {
  try {
    const { orderId, itemId } = req.body;
    const { _id: requesterId, role } = req.user;
    return await orderService.refundEscrow(orderId, itemId, requesterId, role);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deliverOrderItem = async (req) => {
  try {
    const { orderId, itemId, message } = req.body;
    const { _id: creatorId } = req.user;

    return await orderService.deliverOrderItem(orderId, itemId, creatorId, message);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.reviewDelivery = async (req) => {
  try {
    const { orderId, itemId, status, message } = req.body;
    const { _id: brandId } = req.user;
    return await orderService.reviewDelivery(orderId, itemId, brandId, status, message);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
