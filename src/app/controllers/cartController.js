const cartService = require("../services/cartService");
const { statusCode } = require("../../config/default.json");


exports.addToCart = async (req) => {
  try {
    const { serviceId, price, quantity } = req.body;
    const { _id: userId, role } = req.user;
    return await cartService.addToCart(userId, role, serviceId, price, quantity);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.removeFromCart = async (req) => {
  try {
    const { id } = req.params;
    const { _id: userId } = req.user;
    return await cartService.removeFromCart(userId, id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getCart = async (req) => {
  try {
    const { _id: userId } = req.user;
    return await cartService.getCart(userId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.clearCart = async (req) => {
  try {
    const { _id: userId } = req.user;
    return await cartService.clearCart(userId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateQuantity = async (req) => {
  try {
    const { id: serviceId } = req.params;
    const { quantity } = req.body;
    const { _id: userId } = req.user;

    if (quantity === undefined || isNaN(Number(quantity))) {
      throw new Error("Quantity is required and must be a number");
    }

    return await cartService.updateQuantity(userId, serviceId, quantity);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
