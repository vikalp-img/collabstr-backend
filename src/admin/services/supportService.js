const mongoose = require("mongoose");
const Support = require("../../models/supportModel");
const { statusCode, resMessage } = require("../../config/default.json");

exports.getAllRequests = async (query) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      status,
      issueCategory,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter = {};

    // Stats
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      Support.countDocuments(),
      Support.countDocuments({ status: "open" }),
      Support.countDocuments({ status: "in-progress" }),
      Support.countDocuments({ status: "resolved" }),
      Support.countDocuments({ status: "closed" }),
    ]);

    const stats = { total, open, in_progress: inProgress, resolved, closed };

    // Search
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { message: searchRegex },
      ];
    }

    // Filters
    if (status && status !== "all") {
      filter.status = status;
    }

    if (issueCategory && issueCategory !== "all") {
      filter.issueCategory = issueCategory;
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skipCount = (Number(page) - 1) * Number(limit);

    const aggregationResults = await Support.aggregate([
      { $match: filter },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortObj },
            { $skip: skipCount },
            { $limit: Number(limit) },
          ]
        }
      }
    ]);

    const requests = aggregationResults[0].data;
    const totalCount = aggregationResults[0].metadata[0] ? aggregationResults[0].metadata[0].total : 0;

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        supports: requests,
        stats,
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    };
  } catch (error) {
    console.error("Error in getAllRequests (Support):", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getRequestById = async (id) => {
  try {
    const supportRequest = await Support.findById(id).lean();

    if (!supportRequest) {
      return {
        statusCode: statusCode.NOT_FOUND,
        success: false,
        message: "Support request not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: supportRequest,
    };
  } catch (error) {
    console.error("Error in getRequestById (Support):", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.updateStatus = async (id, data) => {
  try {
    const { status } = data;

    const updateData = {};
    if (status) updateData.status = status;

    if (status === "resolved") {
      updateData.resolvedAt = new Date();
    }

    const updatedRequest = await Support.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!updatedRequest) {
      return {
        statusCode: statusCode.NOT_FOUND,
        success: false,
        message: "Support request not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Updated_Successfully,
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Error in updateStatus (Support):", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
