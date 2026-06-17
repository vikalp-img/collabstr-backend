const service = require("../services/footerLinkService");
const { statusCode } = require("../../config/default.json");

exports.getActiveFooterLinks = async (req) => {
  try {
    return await service.getActiveFooterLinks(req);
  } catch (error) {
    console.error("❌ Error in getActiveFooterLinks (App):", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
