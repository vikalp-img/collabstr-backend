const Order = require("../../models/orderModel");
const Escrow = require("../../models/escrowModel");
const CreatorProfile = require("../../models/creatorProfileModel");
const Review = require("../../models/reviewModel");
const Service = require("../../models/serviceModel");
const { statusCode } = require("../../config/default.json");
const mongoose = require("mongoose");


exports.getCreatorDashboard = async (creatorId) => {
  try {
    const objCreatorId = new mongoose.Types.ObjectId(creatorId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Earnings Stats (Released vs Holding)
    const earningsStats = await Escrow.aggregate([
      { $match: { creatorId: objCreatorId } },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: { $cond: [{ $eq: ["$status", "released"] }, "$amount", 0] },
          },
          pendingEarnings: {
            $sum: { $cond: [{ $eq: ["$status", "holding"] }, "$amount", 0] },
          },
        },
      },
    ]);

    const totalEarnings = earningsStats.length > 0 ? earningsStats[0].totalEarnings : 0;
    const pendingEarnings = earningsStats.length > 0 ? earningsStats[0].pendingEarnings : 0;

    // 2. Order Stats (Total and Weekly Growth)
    const orderStats = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.creatorId": objCreatorId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          newThisWeek: {
            $sum: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] },
          },
        },
      },
    ]);

    const totalOrders = orderStats.length > 0 ? orderStats[0].totalOrders : 0;
    const newThisWeek = orderStats.length > 0 ? orderStats[0].newThisWeek : 0;

    // 3. Rating & Reviews
    const profile = await CreatorProfile.findOne({ userId: creatorId });
    const reviewCount = await Review.countDocuments({ creatorId });

    // 4. Service Stats
    const activeServices = await Service.countDocuments({
      creatorId,
      isActive: true,
      approvalStatus: 1,
    });
    const draftServices = await Service.countDocuments({
      creatorId,
      approvalStatus: 0,
    });

    // 5. Recent Orders (Last 5 items)
    const recentOrders = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.creatorId": objCreatorId } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }, // Fetch 10 just in case, will slice if needed
      {
        $lookup: {
          from: "users",
          localField: "brandId",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: "$brandInfo" },
      {
        $lookup: {
          from: "services",
          localField: "items.serviceId",
          foreignField: "_id",
          as: "serviceDetails",
        },
      },
      { $unwind: "$serviceDetails" },
      {
        $lookup: {
          from: "servicemasters",
          localField: "serviceDetails.serviceType",
          foreignField: "_id",
          as: "serviceTypeInfo",
        },
      },
      { $unwind: "$serviceTypeInfo" },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          displayOrderId: "$orderId", // Human readable ID like ORD123
          itemId: "$items._id",
          brandName: "$brandInfo.userName",
          brandImage: "$brandInfo.profile_image",
          serviceTitle: "$serviceTypeInfo.title",
          status: "$items.status",
          totalPrice: "$items.totalPrice",
          createdAt: 1,
        },
      },
    ]);

    // 6. Recent Reviews
    const recentReviewsData = await Review.find({ creatorId: objCreatorId })
      .populate("brandId", "userName profile_image")
      .sort({ createdAt: -1 })
      .limit(3);

    const recentReviews = recentReviewsData.map(rev => {
      const diffTime = Math.abs(now - new Date(rev.createdAt));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      let timeStr = `${diffDays}d ago`;
      if (diffDays === 0) {
        const diffHrs = Math.floor(diffTime / (1000 * 60 * 60));
        timeStr = diffHrs > 0 ? `${diffHrs}h ago` : "Just now";
      } else if (diffDays === 1) {
        timeStr = "1d ago";
      }
      return {
        brand: rev.brandId?.userName || "Brand",
        rating: rev.rating,
        note: rev.comment,
        time: timeStr
      };
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creator dashboard data retrieved successfully.",
      data: {
        stats: {
          totalEarnings,
          pendingEarnings,
          totalOrders,
          newThisWeek,
          averageRating: profile ? profile.rating : 0,
          reviewCount,
          activeServices,
          draftServices,
        },
        recentOrders: recentOrders.slice(0, 5),
        recentReviews,
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
