const services = require('../services/userService');
const { statusCode } = require('../../config/default.json');


exports.login = async (req) => {
    try {
        return await services.login(req.body);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.register = async (req) => {
    try {
        return await services.register(req.body);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.registerCreator = async (req) => {
    try {
        return await services.registerCreator(req.body, req.files);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.registerBrand = async (req) => {
    try {
        return await services.registerBrand(req.body);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.editProfile = async (req) => {
    try {
        return await services.editProfile(req.body, req.user._id);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.updateProfile = async (req) => {
    try {
        return await services.updateProfile(req.file, req.user._id);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
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
            message: error.message
        };
    }
};

exports.searchCreators = async (req) => {
    try {
        const loggedInUserId = req.user ? req.user._id : null;
        return await services.searchCreators(req.query, loggedInUserId);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.getCreatorDetails = async (req) => {
    try {
        const loggedInUserId = req.user ? req.user._id : null;
        return await services.getCreatorDetails(req.params.id, loggedInUserId);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.getCreator = async (req) => {
    try {
        return await services.getCreator(req.params.id);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
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
            message: error.message
        };
    }
};

exports.addPortfolioItem = async (req) => {
    try {
        return await services.addPortfolioItem(req.files, req.user._id);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.getPortfolioItems = async (req) => {
    try {
        return await services.getPortfolioItems(req.user._id);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.removePortfolioItem = async (req) => {
    try {
        return await services.removePortfolioItem(req.params.id, req.user._id);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.resendOtp = async (req) => {
    try {
        const { mobile } = req.body;
        return await services.resendOtp(mobile);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.requestPanKyc = async (req) => {
    try {
        const { _id: userId } = req.user;
        return await services.requestPanKyc(userId, req.body);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.requestAadhaarKyc = async (req) => {
    try {
        const { _id: userId } = req.user;
        return await services.requestAadhaarKyc(userId, req.body);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.requestBankKyc = async (req) => {
    try {
        const { _id: userId } = req.user;
        return await services.requestBankKyc(userId, req.body);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.requestEmailVerify = async (req) => {
    try {
        const { _id: userId } = req.user;
        const { email } = req.body;
        return await services.requestEmailVerify(userId, email);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.verifyEmailOtp = async (req) => {
    try {
        const { _id: userId } = req.user;
        const { email, otp } = req.body;
        return await services.verifyEmailOtp(userId, email, otp);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.requestMobileVerify = async (req) => {
    try {
        const { _id: userId } = req.user;
        const { mobile } = req.body;
        return await services.requestMobileVerify(userId, mobile);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.verifyMobileOtp = async (req) => {
    try {
        const { _id: userId } = req.user;
        const { mobile, otp } = req.body;
        return await services.verifyMobileOtp(userId, mobile, otp);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.updateCoverImage = async (req) => {
    try {
        const { _id: userId } = req.user;
        const file = req.file; // From upload.single('cover_image')
        return await services.updateCoverImage(file, userId);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};
exports.requestProfileApproval = async (req) => {
    try {
        const userId = req.user._id;
        return await services.requestProfileApproval(userId);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.checkEmail = async (req) => {
    try {
        const { email } = req.body;
        return await services.checkEmail(email);
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};
