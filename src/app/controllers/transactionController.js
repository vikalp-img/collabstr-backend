const services = require('../services/transactionService');
const { statusCode } = require('../../config/default.json');


exports.getTransactions = async (req) => {
    try {
        const { _id: userId } = req.user;
        return await services.getTransactions(userId, req.query);
    } catch (error) {
        console.error("❌ Error in getTransactions:", error);
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.getTransactionDetails = async (req) => {
    try {
        const { _id: userId } = req.user;
        const { id } = req.params;
        return await services.getTransactionDetails(id, userId);
    } catch (error) {
        console.error("❌ Error in getTransactionDetails:", error);
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};
