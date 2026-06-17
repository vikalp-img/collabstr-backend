const services = require("../services/creatorService");
const { statusCode } = require("../../config/default.json");


exports.getAllCreators = async (req) => {
  try {
    return await services.getAllCreators(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.blockUnblockCreator = async (req) => {
  try {
    return await services.blockUnblockUser(req.params.id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.approveRejectCreator = async (req) => {
  try {
    return await services.approveRejectCreator(req.params.id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getCreatorDetails = async (req) => {
  try {
    return await services.getCreatorDetails(req.params.id);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
exports.toggleFeaturedCreator = async (req) => {
  try {
    return await services.toggleFeaturedCreator(req.params.id, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
