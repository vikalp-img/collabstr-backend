const Feature = require("../../models/featureModel");
const Plan = require("../../models/planModel");
const { statusCode, resMessage } = require("../../config/default.json");

exports.createFeature = async (body) => {
  try {
    const { name, description } = body;

    const feature = await Feature.create({
      name,
      description,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Feature created successfully",
      data: feature,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getFeatures = async (query) => {
  try {
    const { search = "", page = 1, limit = 10, status } = query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (status !== undefined) {
      filter.status = status === "true";
    }

    const skip = (page - 1) * limit;
    const features = await Feature.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalCount = await Feature.countDocuments(filter);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        features,
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getFeatureById = async (id) => {
  try {
    const feature = await Feature.findById(id);
    if (!feature) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Feature not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: feature,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.updateFeature = async (id, body) => {
  try {
    const feature = await Feature.findByIdAndUpdate(id, body, { new: true });
    if (!feature) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Feature not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Feature updated successfully",
      data: feature,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteFeature = async (id) => {
  try {
    // Check if any plan is using this feature
    const planCount = await Plan.countDocuments({
      "features.featureId": id,
    });

    if (planCount > 0) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Cannot delete feature as it is part of one or more plans.",
      };
    }

    const feature = await Feature.findByIdAndDelete(id);
    if (!feature) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Feature not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Feature deleted successfully",
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
