const mongoose = require("mongoose");
const SocialAccount = require("../../models/socialAccountModel");
const Platform = require("../../models/platformModel");
const { statusCode } = require("../../config/default.json");


exports.addSocialAccount = async (req) => {
  try {
    const { platform: platformKey, handle, followers } = req.body;
    const creatorId = req.user._id;

    // Resolve platform key to ID
    const platform = await Platform.findOne({ key: platformKey.toLowerCase() });
    if (!platform) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: `Platform '${platformKey}' not found`,
      };
    }

    // Check if creator already has an account on this platform
    const existingAccount = await SocialAccount.findOne({
      creatorId,
      platform: platform._id,
    });

    if (existingAccount) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: `You have already linked an account for ${platform.name}`,
      };
    }

    const socialAccount = await SocialAccount.create({
      creatorId,
      platform: platform._id,
      handle,
      followers: followers || 0,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Social account linked successfully",
      data: socialAccount,
    };
  } catch (error) {
    console.error("❌ Error in addSocialAccount:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getSocialAccounts = async (req) => {
  try {
    const creatorId = req.user._id;

    const accounts = await SocialAccount.aggregate([
      { 
        $match: { 
          creatorId: new mongoose.Types.ObjectId(creatorId), 
          isActive: true 
        } 
      },
      {
        $lookup: {
          from: "platforms",
          localField: "platform",
          foreignField: "_id",
          as: "platform",
        },
      },
      { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          handle: 1,
          followers: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          "platform.name": 1,
          "platform.key": 1,
          "platform.icon": 1,
          "platform._id": 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Social accounts fetched successfully",
      data: accounts,
    };
  } catch (error) {
    console.error("❌ Error in getSocialAccounts:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.removeSocialAccount = async (req) => {
  try {
    const { id } = req.params;
    const creatorId = req.user._id;

    const account = await SocialAccount.findOne({ _id: id, creatorId });
    if (!account) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Social account not found or access denied",
      };
    }

    await SocialAccount.findByIdAndDelete(id);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Social account unlinked successfully",
    };
  } catch (error) {
    console.error("❌ Error in removeSocialAccount:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateSocialAccount = async (req) => {
  try {
    const { id } = req.params;
    const { handle, followers } = req.body;
    const creatorId = req.user._id;

    const account = await SocialAccount.findOne({ _id: id, creatorId });
    if (!account) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Social account not found or access denied",
      };
    }

    const updateData = {};
    if (handle !== undefined) updateData.handle = handle;
    if (followers !== undefined) updateData.followers = followers;

    await SocialAccount.findByIdAndUpdate(
      id,
      { $set: updateData }
    );

    const updatedAccount = await SocialAccount.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "platforms",
          localField: "platform",
          foreignField: "_id",
          as: "platform",
        },
      },
      { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          handle: 1,
          followers: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          "platform.name": 1,
          "platform.key": 1,
          "platform.icon": 1,
          "platform._id": 1,
        },
      },
    ]);

    const result = updatedAccount.length > 0 ? updatedAccount[0] : null;

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Social account updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("❌ Error in updateSocialAccount:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
