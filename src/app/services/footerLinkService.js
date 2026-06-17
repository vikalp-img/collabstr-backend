const footerLinkModel = require("../../models/footerLinkModel");
const { statusCode } = require("../../config/default.json");

exports.getActiveFooterLinks = async () => {
  try {
    const footerLinks = await footerLinkModel.findOne({});

    if (!footerLinks) {
      return {
        statusCode: statusCode.OK,
        success: true,
        message: "No footer links configured",
        data: null,
      };
    }

    // Filter to only active items
    const activeData = {
      email: footerLinks.email?.isActive ? footerLinks.email : null,
      phone: footerLinks.phone?.isActive ? footerLinks.phone : null,
      address: footerLinks.address?.isActive ? footerLinks.address : null,
      socialLinks: (footerLinks.socialLinks || []).filter(
        (link) => link.isActive
      ),
    };

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Active footer links fetched successfully",
      data: activeData,
    };
  } catch (error) {
    console.error("❌ Error in getActiveFooterLinks:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
