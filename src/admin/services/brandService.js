const userModel = require("../../models/userModel");
const mongoose = require("mongoose");
const brandProfileModel = require("../../models/brandProfileModel");
const subscriptionModel = require("../../models/subscriptionModel");
const { statusCode, resMessage } = require("../../config/default.json");

exports.getAllBrands = async (query) => {
    try {
        const {
            search = "",
            page = 1,
            limit = 10,
            isBlocked,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;

        const filter = { role: "brand" };

        // Search brands by name or email
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { userName: searchRegex },
                { email: searchRegex },
            ];
            
            // If search is numeric, search in mobile
            if (!isNaN(search.trim())) {
                filter.$or.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$mobile" },
                            regex: search.trim(),
                            options: "i",
                        },
                    },
                });
            }
        }

        // Account status filter
        if (isBlocked !== undefined) {
          filter.isBlocked = isBlocked === "true";
        }

        // Stats calculation
        const [totalBrands, totalBlocked] = await Promise.all([
          userModel.countDocuments({ role: "brand" }),
          userModel.countDocuments({ role: "brand", isBlocked: true }),
        ]);

        const stats = {
          totalBrands,
          totalActive: totalBrands - totalBlocked,
          totalBlocked
        };

        const skipCount = (Number(page) - 1) * Number(limit);
        const sortObj = {};
        sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

        const results = await userModel.aggregate([
            { $match: filter },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $sort: sortObj },
                        { $skip: skipCount },
                        { $limit: Number(limit) },
                        {
                            $lookup: {
                                from: "brandprofiles",
                                localField: "_id",
                                foreignField: "userId",
                                as: "brandProfile"
                            }
                        },
                        { $unwind: { path: "$brandProfile", preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "subscriptions",
                                let: { uid: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$brandId", "$$uid"] },
                                                    { $eq: ["$status", "active"] },
                                                    { $gt: ["$endDate", new Date()] }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "plans",
                                            localField: "planId",
                                            foreignField: "_id",
                                            as: "planDetails"
                                        }
                                    },
                                    { $unwind: { path: "$planDetails", preserveNullAndEmptyArrays: true } },
                                    {
                                        $project: {
                                            _id: 1,
                                            brandId: 1,
                                            planId: {
                                                _id: "$planDetails._id",
                                                name: "$planDetails.name"
                                            },
                                            status: 1,
                                            startDate: 1,
                                            endDate: 1
                                        }
                                    }
                                ],
                                as: "activeSubscription"
                            }
                        },
                        { $unwind: { path: "$activeSubscription", preserveNullAndEmptyArrays: true } },
                        {
                            $addFields: {
                                isSubscribed: { $cond: [{ $ifNull: ["$activeSubscription", false] }, true, false] }
                            }
                        },
                        {
                            $project: {
                                password: 0,
                                token: 0,
                                otp: 0,
                                __v: 0
                            }
                        }
                    ]
                }
            }
        ]);

        const totalCount = results[0].metadata[0] ? results[0].metadata[0].total : 0;
        const users = results[0].data;

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Brands retrieved successfully",
            data: {
                users,
                stats,
                totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount / Number(limit)),
            },
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.getBrandDetails = async (userId) => {
    try {
        const results = await userModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: "brandprofiles",
                    localField: "_id",
                    foreignField: "userId",
                    as: "profile"
                }
            },
            { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "subscriptions",
                    let: { uid: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$brandId", "$$uid"] },
                                        { $eq: ["$status", "active"] },
                                        { $gt: ["$endDate", new Date()] }
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "plans",
                                localField: "planId",
                                foreignField: "_id",
                                as: "planDetails"
                            }
                        },
                        { $unwind: { path: "$planDetails", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: 1,
                                status: 1,
                                startDate: 1,
                                endDate: 1,
                                planId: {
                                    _id: "$planDetails._id",
                                    name: "$planDetails.name",
                                    price: "$planDetails.price",
                                    duration: "$planDetails.duration"
                                }
                            }
                        }
                    ],
                    as: "activeSubscription"
                }
            },
            { $unwind: { path: "$activeSubscription", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    password: 0,
                    token: 0,
                    otp: 0,
                    __v: 0
                }
            }
        ]);

        const brandData = results[0];
        if (!brandData) {
            return {
                statusCode: statusCode.DATA_NOT_FOUND,
                success: false,
                message: resMessage.User_Not_Found,
            };
        }

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Brand details retrieved successfully",
            data: {
                user: brandData,
                profile: brandData.profile || null,
                activeSubscription: brandData.activeSubscription || null,
                isSubscribed: !!brandData.activeSubscription
            },
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.blockUnblockUser = async (userId, body) => {
  try {
      if (body.isBlocked === undefined || body.isBlocked === null) {
          return {
              statusCode: statusCode.BAD_REQUEST,
              success: false,
              message: "isBlocked field is required",
          };
      }

      const user = await userModel.findById(userId);

      if (!user) {
          return {
              statusCode: statusCode.DATA_NOT_FOUND,
              success: false,
              message: resMessage.User_Not_Found,
          };
      }

      const isBlocked = String(body.isBlocked) === "true";

      await userModel.findByIdAndUpdate(
          userId,
          { isBlocked: isBlocked },
          { new: true },
      );

      const message = isBlocked
          ? "Brand blocked successfully"
          : "Brand unblocked successfully";

      return {
          statusCode: statusCode.OK,
          success: true,
          message
      };
  } catch (error) {
      return {
          statusCode: statusCode.BAD_REQUEST,
          success: false,
          message: error.message,
      };
  }
};
