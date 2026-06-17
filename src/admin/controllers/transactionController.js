const services = require("../services/transactionService");
const { statusCode } = require("../../config/default.json");

exports.getAllTransactions = async (req) => {
  try {
    return await services.getAllTransactions(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getTransactionDetails = async (req) => {
  try {
    return await services.getTransactionDetails(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
