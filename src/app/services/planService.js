const Plan = require("../../models/planModel");
const mongoose = require("mongoose");
const { statusCode, resMessage } = require("../../config/default.json");

/**
 * Get all active plans for brands.
 */
exports.getPlans = async (query) => {
  try {
    const { search = "", page = 1, limit = 10 } = query;
    const filter = { status: true };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const plans = await Plan.aggregate([
      { $match: filter },
      { $sort: { price: 1 } },
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
