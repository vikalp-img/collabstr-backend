const Platform = require("../../models/platformModel");
const { statusCode } = require("../../config/default.json");


exports.getPlatforms = async () => {
  try {
    const platforms = await Platform.find({ isActive: true }).sort({ name: 1 });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Platforms fetched successfully",
      data: platforms,
    };
  } catch (error) {
    console.error("❌ Error in getPlatforms:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
