const serviceService = require("../services/serviceService");
const { statusCode } = require("../../config/default.json");


exports.getServices = async (req) => {
  try {
    return await serviceService.getServices(req.query);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateApprovalStatus = async (req) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;
    return await serviceService.updateApprovalStatus(id, approvalStatus);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};