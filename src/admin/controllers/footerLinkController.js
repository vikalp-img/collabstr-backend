const services = require("../services/footerLinkService");
const { statusCode } = require("../../config/default.json");

exports.getFooterLinks = async (req) => {
    try {
        return await services.getFooterLinks(req);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.upsertFooterLinks = async (req) => {
    try {
        return await services.upsertFooterLinks(req);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.toggleFooterLinkStatus = async (req) => {
    try {
        return await services.toggleFooterLinkStatus(req);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
