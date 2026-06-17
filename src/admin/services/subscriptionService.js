const Subscription = require("../../models/subscriptionModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const Plan = require("../../models/planModel");
const { statusCode, resMessage } = require("../../config/default.json");

/**
 * Get all subscriptions with filtering and pagination.
 */
exports.getAllSubscriptions = async (query) => {
  try {
    const { brandId, planId, status, page = 1, limit = 10 } = query;
    const filter = {};

    if (brandId) filter.brandId = brandId;
    if (planId) filter.planId = planId;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const subscriptions = await Subscription.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "users",
          localField: "brandId",
          foreignField: "_id",
          as: "brandId",
          pipeline: [{ $project: { userName: 1, email: 1, profile_image: 1 } }]
        }
      },
      { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "planId",
          pipeline: [{ $project: { name: 1, price: 1, duration: 1 } }]
        }
      },
      { $unwind: { path: "$planId", preserveNullAndEmptyArrays: true } }
    ]);

    const totalCount = await Subscription.countDocuments(filter);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        subscriptions,
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

/**
 * Cancel a subscription.
 */
exports.cancelSubscription = async (id) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    );

    if (!subscription) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Subscription not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Subscription cancelled successfully",
      data: subscription,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
/**
 * Get all subscriptions for a specific brand.
 */
exports.getSubscriptionsByBrand = async (brandId) => {
  try {
    const subscriptions = await Subscription.aggregate([
      { $match: { brandId: new mongoose.Types.ObjectId(brandId) } },
      { $sort: { startDate: -1 } },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "planId",
          pipeline: [{ $project: { name: 1, price: 1, duration: 1 } }]
        }
      },
      { $unwind: { path: "$planId", preserveNullAndEmptyArrays: true } }
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: subscriptions,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
