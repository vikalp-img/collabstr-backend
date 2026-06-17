const Support = require("../../models/supportModel");
const { statusCode, resMessage } = require("../../config/default.json");

exports.submitRequest = async (data) => {
  try {
    const { fullName, email, issueCategory, message } = data;

    const supportData = {
      fullName,
      email,
      issueCategory,
      message,
    };

    const newSupportRequest = await Support.create(supportData);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Created_Successfully,
      data: newSupportRequest,
    };
  } catch (error) {
    console.error("Error in submitRequest (Support):", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
