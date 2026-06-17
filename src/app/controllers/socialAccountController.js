const socialAccountService = require("../services/socialAccountService");
const { statusCode } = require("../../config/default.json");


exports.addSocialAccount = async (req) => {
  try {
    return await socialAccountService.addSocialAccount(req);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getSocialAccounts = async (req) => {
  try {
    return await socialAccountService.getSocialAccounts(req);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.removeSocialAccount = async (req) => {
  try {
    return await socialAccountService.removeSocialAccount(req);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateSocialAccount = async (req) => {
  try {
    return await socialAccountService.updateSocialAccount(req);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
