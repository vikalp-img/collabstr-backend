const Subscription = require("../../models/subscriptionModel");
const mongoose = require("mongoose");
const Plan = require("../../models/planModel");
const Wallet = require("../../models/walletModel");
const Transaction = require("../../models/transactionModel");
const User = require("../../models/userModel");
const Usage = require("../../models/usageModel");

const { statusCode } = require("../../config/default.json");


exports.purchasePlan = async (userId, planId) => {
  try {
    // 1. Validate User
    const user = await User.findById(userId);
    if (!user || user.role !== "brand") {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Only brands can purchase subscription plans",
      };
    }

    // 2. Validate Plan
    const plan = await Plan.findOne({ _id: planId, status: true });
    if (!plan) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: "Plan not found or inactive",
      };
    }

    // 3. Validate Wallet and Balance
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0 });
    }

    if (wallet.balance < plan.price) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Insufficient wallet balance",
      };
    }

    // 4. Calculate Duration
    const durationDays = plan.duration === "yearly" ? 365 : 30;
    const durationMs = durationDays * 24 * 60 * 60 * 1000;

    const now = new Date();
    let startDate, endDate;

    // 5. Free plan replaces all existing subscriptions; paid plans stack
    const isFreePlan = plan.price === 0 || plan.name.toLowerCase() === "free";

    if (isFreePlan) {
      // Cancel all existing active/pending subscriptions
      await Subscription.updateMany(
        { brandId: userId, status: { $in: ["active", "pending"] } },
        { $set: { status: "cancelled" } }
      );
      startDate = now;
    } else {
      // Paid plan: reject if same plan, replace if different plan
      const lastSub = await Subscription.findOne({
        brandId: userId,
        status: "active",
      }).sort({ endDate: -1 }).limit(1);

      if (lastSub) {
        if (lastSub.planId.toString() === planId.toString()) {
          return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: "You already have an active subscription for this exact plan.",
          };
        } else {
          // Different plan: Cancel all existing subscriptions and start from now
          await Subscription.updateMany(
            { brandId: userId, status: { $in: ["active", "pending"] } },
            { $set: { status: "cancelled" } }
          );
          startDate = now;
        }
      } else {
        startDate = now;
      }
    }
    endDate = new Date(startDate.getTime() + durationMs);

    // 6. Perform Transaction (Only for paid plans)
    let transaction = null;
    if (!isFreePlan) {
      const openingBalance = wallet.balance;
      wallet.balance -= plan.price;
      await wallet.save();

      const transactionId = "PLN" + Date.now() + Math.floor(Math.random() * 1000);
      transaction = await Transaction.create({
        userId,
        amount: plan.price,
        transactionId,
        type: "debit",
        paymentStatus: "success",
        openingBalance,
        closingBalance: wallet.balance,
        source: "plan_purchase",
      });
    }

    // 7. Create a new Subscription record
    const subscription = await Subscription.create({
      brandId: userId,
      planId,
      startDate,
      endDate,
      status: "active",
      lastPaymentId: transaction ? transaction._id : null,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Subscription purchased successfully",
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
 * Brand requested cancellation - instantly drops them down to the free tier (Basic). No refunds.
 */
exports.cancelBrandSubscription = async (brandId) => {
  try {
    const activeSubArray = await Subscription.aggregate([
      { $match: { brandId: new mongoose.Types.ObjectId(brandId), status: "active" } },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "planId"
        }
      },
      { $unwind: "$planId" }
    ]);

    const activeSub = activeSubArray[0];
    if (!activeSub) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "You do not have an active subscription to cancel.",
      };
    }

    if (activeSub.planId.name.toLowerCase() === "basic" || activeSub.planId.price === 0) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "You cannot cancel the free tier plan.",
      };
    }

    // Cancel the current plan
    await Subscription.updateMany(
      { brandId, status: { $in: ["active", "pending"] } },
      { $set: { status: "cancelled", isCancelled: true } }
    );

    // Explicitly auto-purchase the free fallback
    const freePlan = await Plan.findOne({ name: "Basic", status: true });
    if (freePlan) {
      await exports.purchasePlan(brandId, freePlan._id);
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: `Your '${activeSub.planId.name}' subscription has been immediately cancelled.`,
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
 * Get active subscription for a brand.
 */
exports.getActiveSubscription = async (userId) => {
  try {
    const now = new Date();
    const subs = await Subscription.aggregate([
      {
        $match: {
          brandId: new mongoose.Types.ObjectId(userId),
          status: "active",
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
      },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "planId",
          pipeline: [
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
          ],
        },
      },
      { $unwind: { path: "$planId", preserveNullAndEmptyArrays: true } },
    ]);

    const subscription = subs.length > 0 ? subs[0] : null;

    return subscription;
  } catch (error) {
    console.error("getActiveSubscription error:", error);
    return null;
  }
};

/**
 * Check if the brand can access a feature.
 */
exports.checkFeatureLimit = async (userId, featureName) => {
  try {
    const activeSubscription = await exports.getActiveSubscription(userId);
    if (!activeSubscription) {
      // Free Tier Logic if no subscription (Fallback to Basic)
      const freePlan = await Plan.findOne({ name: "Basic", status: true }).populate("features.featureId").lean();
      if (!freePlan) return { allowed: false, message: "No active plan found." };
      
      const featureData = freePlan.features.find(f => f.featureId.name === featureName);
      if (!featureData) return { allowed: false, message: "Feature not supported." };

      const usage = await Usage.findOne({ brandId: userId, subscriptionId: null, featureName });
      const currentCount = usage ? usage.count : 0;

      if (featureData.limit === -1 || currentCount < featureData.limit) {
        return { allowed: true, limit: featureData.limit, planName: "Basic" };
      }
      return { allowed: false, limit: featureData.limit, planName: "Basic" };
    }

    // Active Subscriber logic
    const featureData = activeSubscription.planId.features.find(
      (f) => f.featureId && f.featureId.name === featureName
    );

    if (!featureData) {
      return { allowed: false, message: "Feature not available in your plan." };
    }

    if (featureData.limit === -1) {
      return { allowed: true, limit: -1, planName: activeSubscription.planId.name };
    }

    const usage = await Usage.findOne({
      brandId: userId,
      subscriptionId: activeSubscription._id,
      featureName,
    });

    const currentCount = usage ? usage.count : 0;
    if (currentCount < featureData.limit) {
      return { allowed: true, limit: featureData.limit, planName: activeSubscription.planId.name };
    }

    return { allowed: false, limit: featureData.limit, planName: activeSubscription.planId.name };
  } catch (error) {
    console.error("checkFeatureLimit error:", error);
    return { allowed: false, message: error.message };
  }
};

/**
 * Log usage activity after a feature is consumed.
 */
exports.logActivity = async (userId, activityType, targetId = null, metadata = {}) => {
  try {
    const activeSubscription = await exports.getActiveSubscription(userId);
    const subId = activeSubscription ? activeSubscription._id : null;

    // Map internal types to feature names if necessary
    const internalToFeatureMap = {
      "profile_view": "Profile Access",
      "search": "Search & Discovery",
      "hire": "Hire Creator",
      "mark_favorite": "Mark Favourite"
    };

    const featureName = internalToFeatureMap[activityType] || activityType;

    await Usage.findOneAndUpdate(
      { brandId: userId, subscriptionId: subId, featureName },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    return true;
  } catch (error) {
    console.error("logActivity error:", error);
    return false;
  }
};

/**
 * Get usage summary for a brand.
 */
exports.getUsage = async (userId) => {
  try {
    const activeSub = await exports.getActiveSubscription(userId);
    const subId = activeSub ? activeSub._id : null;
    const plan = activeSub ? activeSub.planId : await Plan.findOne({ name: "Basic", status: true }).populate("features.featureId").lean();

    if (!plan) throw new Error("Plan not found");

    const usageRecords = await Usage.find({ brandId: userId, subscriptionId: subId }).lean();

    const summary = plan.features.map(f => {
      const usage = usageRecords.find(u => u.featureName === f.featureId.name);
      return {
        feature: f.featureId.name,
        limit: f.limit,
        used: usage ? usage.count : 0,
        remaining: f.limit === -1 ? -1 : Math.max(0, f.limit - (usage ? usage.count : 0))
      };
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      data: {
        planName: plan.name,
        isSubscribed: !!activeSub,
        subscriptionId: subId,
        usage: summary,
        expiryDate: activeSub ? activeSub.endDate : null
      }
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};