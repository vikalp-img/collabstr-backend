const cmsModel = require("../../models/cmsModel");
const { statusCode, resMessage } = require("../../config/default.json");


exports.getCmsContent = async (type) => {
  try {
    let query = {};
    if (type) query.type = type;

    const cmsContent = await cmsModel.find(query).select("-createdAt -updatedAt").lean();

    if (!cmsContent || cmsContent.length === 0) {
      return {
        statusCode: statusCode.OK,
        success: true,
        message: "No CMS content found",
        data: type ? null : [],
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: type ? cmsContent[0] : cmsContent,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
