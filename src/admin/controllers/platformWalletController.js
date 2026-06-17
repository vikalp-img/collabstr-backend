const service = require("../services/platformWalletService");
const { statusCode } = require("../../config/default.json");

exports.getPlatformWallet = async (req) => {
  try {
    const { status, page, limit } = req.query;
    return await service.getPlatformWallet({ status, page, limit });
  } catch (error) {
    return { statusCode: statusCode.BAD_REQUEST, success: false, message: error.message };
  }
};


exports.getPlatformTransactions = async (req) => {
  try {
    const { page, limit } = req.query;
    return await service.getPlatformTransactions({ page, limit });
  } catch (error) {
    return { statusCode: statusCode.BAD_REQUEST, success: false, message: error.message };
  }
};

exports.deposit = async (req) => {
  try {
    const { amount, description } = req.body;
    const adminId = req.user._id;
    return await service.deposit(adminId, { amount, description });
  } catch (error) {
    return { statusCode: statusCode.BAD_REQUEST, success: false, message: error.message };
  }
};

exports.depositToUserWallet = async (req) => {
  try {
    const { userId, amount, description } = req.body;
    const adminId = req.user._id;
    return await service.depositToUserWallet(adminId, { userId, amount, description });
  } catch (error) {
    return { statusCode: statusCode.BAD_REQUEST, success: false, message: error.message };
  }
};

