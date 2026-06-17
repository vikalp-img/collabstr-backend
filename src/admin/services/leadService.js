const Lead = require("../../models/leadModel");
const { statusCode, resMessage } = require("../../config/default.json");
const mongoose = require("mongoose");

exports.getAllLeads = async (query) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter = {};

    // Stats
    const [total, active, unsubscribed] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ status: "active" }),
      Lead.countDocuments({ status: "unsubscribed" }),
    ]);

    const stats = { total, active, unsubscribed };

    // Search
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.email = searchRegex;
    }

    // Filters
    if (status && status !== "all") {
      filter.status = status;
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skipCount = (Number(page) - 1) * Number(limit);

    const aggregationResults = await Lead.aggregate([
      { $match: filter },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortObj },
            { $skip: skipCount },
            { $limit: Number(limit) },
          ],
        },
      },
    ]);

    const leads = aggregationResults[0].data;
    const totalCount = aggregationResults[0].metadata[0] ? aggregationResults[0].metadata[0].total : 0;

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        leads,
        stats,
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    };
    
  } catch (error) {
    console.error("Error in getAllLeads", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getLeadById = async (id) => {
  try {
    const lead = await Lead.findById(id).lean();

    if (!lead) {
      return {
        statusCode: statusCode.NOT_FOUND,
        success: false,
        message: "Lead not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: lead,
    };

  } catch (error) {
    console.error("Error in getLeadById", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.updateLead = async (id, data) => {
  try {
    const { status } = data;

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === "unsubscribed") {
        updateData.unsubscribedAt = new Date();
      } else {
        updateData.unsubscribedAt = null;
        updateData.subscribedAt = new Date();
      }
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!updatedLead) {
      return {
        statusCode: statusCode.NOT_FOUND,
        success: false,
        message: "Lead not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Updated_Successfully,
      data: updatedLead,
    };

  } catch (error) {
    console.error("Error in updateLead", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteLead = async (id) => {
  try {
    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return {
        statusCode: statusCode.NOT_FOUND,
        success: false,
        message: "Lead not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Lead deleted successfully",
    };

  } catch (error) {
    console.error("Error in deleteLead", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
