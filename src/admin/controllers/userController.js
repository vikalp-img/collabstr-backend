const services = require("../services/userService");
const { statusCode } = require("../../config/default.json");


exports.login = async ({ body }) => {
  try {
    return await services.login(body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.logout = async (req) => {
  try {
    return await services.logout(req.user._id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.resetPassword = async (req) => {
  try {
    return await services.resetPassword(req.user._id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getProfile = async (req) => {
  try {
    return await services.getProfile(req.user._id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateProfile = async (req) => {
  try {
    return await services.updateProfile(req.user._id, req.body, req.file);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};