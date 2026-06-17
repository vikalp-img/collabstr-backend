const services = require('../services/walletService');
const { statusCode } = require('../../config/default.json');

exports.getWallet = async (req) => {
    try {
        return await services.getWallet(req.user._id);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.addFunds = async (req) => {
    try {
        const { amount } = req.body;
        const { _id: userId } = req.user;
        return await services.addFunds(userId, amount);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.removeFunds = async (req) => {
    try {
        const { amount } = req.body;
        const { _id: userId } = req.user;
        return await services.removeFunds(userId, amount);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};
