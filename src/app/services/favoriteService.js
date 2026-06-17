const Favorite = require("../../models/favoriteModel");
const FavoriteList = require("../../models/favoriteListModel");
const User = require("../../models/userModel");
const { statusCode } = require("../../config/default.json");


exports.createList = async (userId, name, description) => {
  try {
    const existingList = await FavoriteList.findOne({ userId, name });
    if (existingList) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "List with this name already exists.",
      };
    }
    const data = await FavoriteList.create({ userId, name, description });
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Favorite list created successfully.",
      data,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getLists = async (userId) => {
  try {
    const mongoose = require("mongoose");
    const objUserId = new mongoose.Types.ObjectId(userId);

    const data = await FavoriteList.aggregate([
      { $match: { userId: objUserId } },
      {
        $lookup: {
          from: "favorites",
          localField: "_id",
          foreignField: "listId",
          as: "favorites",
        },
      },
      {
        $addFields: {
          influencerCount: { $size: "$favorites" },
          firstCreatorId: { $arrayElemAt: ["$favorites.creatorId", 0] },
        },
      },
      {
        $lookup: {
          from: "portfolios",
          localField: "firstCreatorId",
          foreignField: "creatorId",
          as: "firstPortfolio",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          influencerCount: 1,
          firstImage: { $arrayElemAt: ["$firstPortfolio.media.url", 0] },
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Favorite lists retrieved successfully.",
      data,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateList = async (userId, listId, updates) => {
  try {
    const list = await FavoriteList.findOneAndUpdate(
      { _id: listId, userId },
      { $set: updates },
      { new: true }
    );
    if (!list) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "List not found or unauthorized.",
      };
    }
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Favorite list updated successfully.",
      data: list,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteList = async (userId, listId) => {
  try {
    const deletedList = await FavoriteList.findOneAndDelete({ _id: listId, userId });
    if (!deletedList) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "List not found or unauthorized.",
      };
    }
    // Remove all creators favorited in this list
    await Favorite.deleteMany({ listId });
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Favorite list deleted successfully.",
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

const subscriptionService = require("./subscriptionService");

exports.addCreatorToList = async (userId, creatorId, listId) => {
  try {
    // 0. Check Plan Limits
    const limitCheck = await subscriptionService.checkFeatureLimit(userId, "Mark Favourite");
    if (!limitCheck.allowed) {
      return {
        statusCode: statusCode.FORBIDDEN,
        success: false,
        message: `You have reached your monthly shortlisting limit of ${limitCheck.limit} for the ${limitCheck.planName} plan. Please upgrade to favorite more creators.`,
      };
    }

    // Verify list ownership
    const list = await FavoriteList.findOne({ _id: listId, userId });
    if (!list) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Target list not found or unauthorized.",
      };
    }

    // Verify creator existence and role
    const creator = await User.findOne({ _id: creatorId, role: "creator" });
    if (!creator) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Target user is not a creator or does not exist.",
      };
    }

    // Check if relationship already exists
    const existingFavorite = await Favorite.findOne({ userId, creatorId, listId });
    if (existingFavorite) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Creator is already in this list.",
      };
    }

    const data = await Favorite.create({ userId, creatorId, listId });
    
    // Log the activity for subscription tracking
    await subscriptionService.logActivity(userId, "mark_favorite", creatorId);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creator added to list successfully.",
      data,
    };

  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.removeCreatorFromList = async (userId, creatorId, listId) => {
  try {
    const query = { userId, creatorId };
    if (listId) {
      query.listId = listId;
    }

    const result = await Favorite.deleteMany(query);
    if (result.deletedCount === 0) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Relationship not found.",
      };
    }
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creator removed from favorite successfully.",
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getCreatorsInList = async (userId, listId) => {
  try {
    const mongoose = require("mongoose");
    const list = await FavoriteList.findOne({ _id: listId, userId });
    if (!list) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "List not found or unauthorized.",
      };
    }

    // Aggregate to fetch creator details from User and CreatorProfile models
    const creators = await Favorite.aggregate([
      { $match: { listId: new mongoose.Types.ObjectId(listId), userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      { $unwind: "$creatorInfo" },
      {
        $lookup: {
          from: "creatorprofiles",
          localField: "creatorId",
          foreignField: "userId",
          as: "profileInfo",
        },
      },
      { $unwind: { path: "$profileInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "socialaccounts",
          let: { userId: "$creatorId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$creatorId", "$$userId"] } } },
            {
              $lookup: {
                from: "platforms",
                localField: "platform",
                foreignField: "_id",
                as: "platformInfo"
              }
            },
            { $unwind: { path: "$platformInfo", preserveNullAndEmptyArrays: true } }
          ],
          as: "socials"
        }
      },
      {
        $lookup: {
          from: "services",
          let: { userId: "$creatorId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$creatorId", "$$userId"] } } }
          ],
          as: "services"
        }
      },
      {
        $lookup: {
          from: "portfolios",
          localField: "creatorId",
          foreignField: "creatorId",
          as: "portfolio"
        }
      },
      {
        $project: {
          _id: "$creatorId",
          name: "$creatorInfo.userName",
          media: { $arrayElemAt: ["$portfolio.media", 0] },
          socialAccount: {
            $let: {
              vars: {
                topAccount: { $arrayElemAt: [{ $sortArray: { input: "$socials", sortBy: { followers: -1 } } }, 0] }
              },
              in: {
                platform: "$$topAccount.platformInfo.name",
                platformKey: "$$topAccount.platformInfo.key",
                platformIcon: "$$topAccount.platformInfo.icon",
                handle: "$$topAccount.handle",
                followers: "$$topAccount.followers"
              }
            }
          },
          rating: { $ifNull: ["$profileInfo.rating", 0] },
          isTopCreator: { $ifNull: ["$profileInfo.isTopCreator", false] },
          title: { $ifNull: ["$profileInfo.title", ""] },
          location: {
            $concat: [
              { $ifNull: ["$profileInfo.location.city", ""] },
              { $cond: [{ $and: ["$profileInfo.location.city", "$profileInfo.location.state"] }, ", ", ""] },
              { $ifNull: ["$profileInfo.location.state", ""] },
              { $cond: [{ $and: ["$profileInfo.location.state", "$profileInfo.location.country"] }, ", ", ""] },
              { $ifNull: ["$profileInfo.location.country", ""] }
            ]
          },
          price: { $min: "$services.price" },
          approvalStatus: "$profileInfo.approvalStatus"
        }
      }
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creators retrieved successfully.",
      data: creators,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getAllFavoriteCreators = async (userId) => {
  try {
    const mongoose = require("mongoose");
    const creators = await Favorite.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$creatorId" } }, // Unique creators across all lists
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      { $unwind: "$creatorInfo" },
      {
        $lookup: {
          from: "creatorprofiles",
          localField: "_id",
          foreignField: "userId",
          as: "profileInfo",
        },
      },
      { $unwind: "$profileInfo" },
      {
        $project: {
          _id: 0,
          creatorId: "$creatorInfo._id",
          name: "$creatorInfo.userName",
          profile_image: "$creatorInfo.profile_image",
          rating: "$profileInfo.rating",
          title: "$profileInfo.title",
          address: "$profileInfo.location.address",
        },
      },
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "All favorite creators retrieved successfully.",
      data: creators,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.isCreatorFavorited = async (userId, creatorId) => {
  try {
    const favoriteCount = await Favorite.countDocuments({ userId, creatorId });
    return {
      statusCode: statusCode.OK,
      success: true,
      data: favoriteCount > 0,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
