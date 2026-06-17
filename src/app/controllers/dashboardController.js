const dashboardService = require("../services/dashboardService");
const { statusCode } = require("../../config/default.json");


exports.getCreatorDashboard = async (req) => {
  try {
    const userId = req.user._id;

    // Role check to ensure only creators see this data
    if (req.user.role !== "creator") {
      throw new Error("Unauthorized: Only creators can access the creator dashboard.");
    }

    return await dashboardService.getCreatorDashboard(userId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
