const userModel = require("../../models/userModel");
const mongoose = require("mongoose");
const orderModel = require("../../models/orderModel");
const subscriptionModel = require("../../models/subscriptionModel");
const serviceModel = require("../../models/serviceModel");
const platformWalletModel = require("../../models/platformWalletModel");
const transactionModel = require("../../models/transactionModel");
const { statusCode } = require("../../config/default.json");
const moment = require("moment");


exports.getStats = async () => {
    try {
        const sixMonthsAgo = moment().subtract(5, 'months').startOf('month').toDate();

        // 1. Snapshot Metrics (Concurrency)
        const [
            totalUsers,
            activeSubscriptions,
            totalOrders,
            completedOrders,
            platformWallet,
            subscriptionRevenueResult,
            pendingKYC,
            pendingServices,
            pendingDisputes,
            mrrResult
        ] = await Promise.all([
            // Total Users (Brands + Creators)
            userModel.countDocuments({ role: { $in: ["brand", "creator"] }, isDeleted: false }),
            
            // Active Subscriptions
            subscriptionModel.countDocuments({ status: "active" }),

            // Total Orders
            orderModel.countDocuments(),

            // Completed Orders (Orders with at least one completed item)
            orderModel.countDocuments({ "items.status": "completed" }),

            // Platform Wallet (for commission earnings)
            platformWalletModel.findOne(),

            // Total Subscription Revenue
            transactionModel.aggregate([
                { $match: { type: "subscription", status: "success" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),

            // Pending KYC
            userModel.countDocuments({
                $or: [
                    { "user_verify.pan_verify": 0 },
                    { "user_verify.aadhar_verify": 0 },
                    { "user_verify.bank_verify": 0 }
                ]
            }),

            // Pending Services
            serviceModel.countDocuments({ approvalStatus: 0 }),

            // Pending Disputes
            orderModel.countDocuments({ "items.status": "dispute" }),

            // MRR Calculation
            subscriptionModel.aggregate([
                { $match: { status: "active" } },
                {
                    $lookup: {
                        from: "plans",
                        localField: "planId",
                        foreignField: "_id",
                        as: "plan"
                    }
                },
                { $unwind: "$plan" },
                {
                    $group: {
                        _id: null,
                        mrr: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$plan.duration", "yearly"] },
                                    { $divide: ["$plan.price", 12] },
                                    "$plan.price"
                                ]
                            }
                        }
                    }
                }
            ])
        ]);

        const platformCommissions = platformWallet ? platformWallet.totalEarned : 0;
        const subscriptionTotal = subscriptionRevenueResult.length > 0 ? subscriptionRevenueResult[0].total : 0;
        const totalEarnings = platformCommissions + subscriptionTotal;
        const currentMRR = mrrResult.length > 0 ? mrrResult[0].mrr : 0;

        // 2. Order Status Breakdown
        const orderStatusStats = await orderModel.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const orderBreakdown = {
            pending: 0,
            accepted: 0,
            rejected: 0,
            reviewing: 0,
            revision: 0,
            completed: 0,
            dispute: 0
        };

        orderStatusStats.forEach(stat => {
            if (orderBreakdown.hasOwnProperty(stat._id)) {
                orderBreakdown[stat._id] = stat.count;
            }
        });

        // 3. Growth Data (Last 6 Months)
        const [userGrowth, orderCommissionGrowth, subscriptionGrowth] = await Promise.all([
            // User Growth
            userModel.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: false } },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]),
            // Order Commission Growth (Commission only)
            orderModel.aggregate([
                { 
                    $match: { 
                        createdAt: { $gte: sixMonthsAgo },
                        paymentStatus: { $in: ["success", "escrow"] }
                    } 
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        amount: { $sum: { $multiply: ["$totalAmount", 0.20] } } // Assuming 20% commission
                    }
                }
            ]),
            // Subscription Revenue Growth
            transactionModel.aggregate([
                {
                    $match: {
                        type: "subscription",
                        status: "success",
                        createdAt: { $gte: sixMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        amount: { $sum: "$amount" }
                    }
                }
            ])
        ]);

        // Format chart data to ensure all 6 months are present
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const m = moment().subtract(i, 'months');
            const monthName = m.format('MMM');
            const year = m.year();
            const month = m.month() + 1;

            const userData = userGrowth.find(u => u._id.year === year && u._id.month === month);
            const commData = orderCommissionGrowth.find(r => r._id.year === year && r._id.month === month);
            const subData = subscriptionGrowth.find(s => s._id.year === year && s._id.month === month);

            chartData.push({
                month: monthName,
                users: userData ? userData.count : 0,
                revenue: (commData ? commData.amount : 0) + (subData ? subData.amount : 0)
            });
        }

        // 4. Recent Activity
        const [recentUsers, recentOrders] = await Promise.all([
            userModel.find({ isDeleted: false })
                .select("userName email role createdAt")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            orderModel.aggregate([
                { $sort: { createdAt: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: "users",
                        localField: "brandId",
                        foreignField: "_id",
                        as: "brandId",
                        pipeline: [{ $project: { userName: 1, email: 1, profile_image: 1 } }]
                    }
                },
                { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } }
            ])
        ]);

        return {
            statusCode: statusCode.OK,
            success: true,
            data: {
                snapshot: {
                    totalUsers,
                    activeSubscriptions,
                    mrr: currentMRR,
                    totalOrders,
                    completedOrders,
                    platformEarnings: totalEarnings,
                    pendingApprovals: {
                        kyc: pendingKYC,
                        services: pendingServices,
                        disputes: pendingDisputes
                    }
                },
                orderBreakdown,
                chartData,
                recentUsers,
                recentOrders
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