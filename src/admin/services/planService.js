const Plan = require("../../models/planModel");
const mongoose = require("mongoose");
const Subscription = require("../../models/subscriptionModel");
const { statusCode, resMessage } = require("../../config/default.json");

exports.createPlan = async (body) => {
  try {
    if (body.platform_fee_percentage !== undefined) {
      const fee = Number(body.platform_fee_percentage);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        throw new Error("platform_fee_percentage must be a number between 0 and 100");
      }
    }

    const plan = await Plan.create(body);
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Plan created successfully",
      data: plan,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getPlans = async (query) => {
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
    const plans = await Plan.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "features",
          localField: "features.featureId",
          foreignField: "_id",
          as: "featureDetails",
        },
      },
      {
        $addFields: {
          features: {
            $map: {
              input: "$features",
              as: "f",
              in: {
                featureId: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$featureDetails",
                        as: "fd",
                        cond: { $eq: ["$$fd._id", "$$f.featureId"] },
                      },
                    },
                    0,
                  ],
                },
                limit: "$$f.limit",
                value: "$$f.value",
              },
            },
          },
        },
      },
      { $project: { featureDetails: 0 } },
    ]);

    const totalCount = await Plan.countDocuments(filter);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        plans,
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

exports.getPlanById = async (id) => {
  try {
    const planArray = await Plan.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "features",
          localField: "features.featureId",
          foreignField: "_id",
          as: "featureDetails",
        },
      },
      {
        $addFields: {
          features: {
            $map: {
              input: "$features",
              as: "f",
              in: {
                featureId: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$featureDetails",
                        as: "fd",
                        cond: { $eq: ["$$fd._id", "$$f.featureId"] },
                      },
                    },
                    0,
                  ],
                },
                limit: "$$f.limit",
                value: "$$f.value",
              },
            },
          },
        },
      },
      { $project: { featureDetails: 0 } },
    ]);

    const plan = planArray[0];
    if (!plan) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Plan not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: plan,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.updatePlan = async (id, body) => {
  try {
    if (body.platform_fee_percentage !== undefined) {
      const fee = Number(body.platform_fee_percentage);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        throw new Error("platform_fee_percentage must be a number between 0 and 100");
      }
    }

    const plan = await Plan.findByIdAndUpdate(id, body, { new: true });
    if (!plan) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Plan not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Plan updated successfully",
      data: plan,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.deletePlan = async (id) => {
  try {
    // Check if any brand is using this plan via subscriptions
    const subscriptionCount = await Subscription.countDocuments({
      planId: id,
      status: "active",
    });

    if (subscriptionCount > 0) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Cannot delete plan as it is currently being used by one or more brands.",
      };
    }

    const plan = await Plan.findByIdAndDelete(id);
    if (!plan) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Plan not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Plan deleted successfully",
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
