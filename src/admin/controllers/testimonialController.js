const services = require("../services/testimonialServices");
const { statusCode } = require("../../config/default.json");

exports.addTestimonial = async (req) => {
    try {
        return await services.addTestimonial(req);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.getTestimonials = async (req) => {
    try {
        return await services.getTestimonials(req);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.updateTestimonial = async (req) => {
    try {
        return await services.updateTestimonial(req);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.deleteTestimonial = async (req) => {
    try {
        return await services.deleteTestimonial(req);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
