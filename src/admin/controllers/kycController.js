const services = require("../services/kycService");
const { statusCode } = require("../../config/default.json");


exports.getKycList = async (req) => {
  try {
    return await services.getKycList(req.query);
  } catch (error) {
    console.error("Error in getKycList controller:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getKycById = async (req) => {
  try {
    return await services.getKycById(req.params.id);
  } catch (error) {
    console.error("Error in getKycById controller:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateKycStatus = async (req) => {
  try {
    return await services.updateKycStatus(req.params.id, req.body);
  } catch (error) {
    console.error("Error in updateKycStatus controller:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
