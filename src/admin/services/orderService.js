const mongoose = require("mongoose");
const orderModel = require("../../models/orderModel");
const userModel = require("../../models/userModel");
const { statusCode, resMessage } = require("../../config/default.json");

exports.getAllOrders = async (query) => {
    try {
        const {
            search = "",
            page = 1,
            limit = 10,
            status, // item status
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;

        const filter = {};

        // Search by orderId
        if (search && search.trim() !== "") {
            filter.orderId = new RegExp(search.trim(), "i");
        }

        // Status filter (on items)
        if (status && status !== "all") {
            filter["items.status"] = status;
        }

        // Stats calculation
        // We want stats across all items in all orders
        const statsAggregation = await orderModel.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            totalOrders: await orderModel.countDocuments(),
            totalItems: 0,
            pending: 0,
            accepted: 0,
            reviewing: 0,
            revision: 0,
            completed: 0,
            dispute: 0,
            rejected: 0
        };

        statsAggregation.forEach(s => {
            if (stats.hasOwnProperty(s._id)) {
                stats[s._id] = s.count;
            }
            stats.totalItems += s.count;
        });

        const skipCount = (Number(page) - 1) * Number(limit);
        const sortObj = {};
        sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

        const results = await orderModel.aggregate([
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
                                from: "users",
                                localField: "brandId",
                                foreignField: "_id",
                                as: "brandId",
                                pipeline: [
                                    {
                                        $lookup: {
                                            from: "brandprofiles",
                                            localField: "_id",
                                            foreignField: "userId",
                                            as: "profile"
                                        }
                                    },
                                    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
                                    { $project: { userName: 1, email: 1, profile_image: 1, companyName: { $ifNull: ["$profile.companyName", ""] } } }
                                ]
                            }
                        },
                        { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },
                        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "users",
                                localField: "items.creatorId",
                                foreignField: "_id",
                                as: "items.creatorId",
                                pipeline: [{ $project: { userName: 1, email: 1, profile_image: 1 } }]
                            }
                        },
                        { $unwind: { path: "$items.creatorId", preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: "$_id",
                                orderId: { $first: "$orderId" },
                                brandId: { $first: "$brandId" },
                                totalAmount: { $first: "$totalAmount" },
                                paymentStatus: { $first: "$paymentStatus" },
                                paymentMethod: { $first: "$paymentMethod" },
                                transactionId: { $first: "$transactionId" },
                                createdAt: { $first: "$createdAt" },
                                updatedAt: { $first: "$updatedAt" },
                                items: { $push: "$items" }
                            }
                        },
                        { $sort: sortObj }
                    ]
                }
            }
        ]);

        const totalCount = results[0].metadata[0] ? results[0].metadata[0].total : 0;
        const orders = results[0].data;

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Orders retrieved successfully",
            data: {
                orders,
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

exports.getOrderDetails = async (orderId) => {
    try {
        const orderArray = await orderModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brandId",
                    pipeline: [
                        {
                            $lookup: {
                                from: "brandprofiles",
                                localField: "_id",
                                foreignField: "userId",
                                as: "profile"
                            }
                        },
                        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
                        { $project: { userName: 1, email: 1, mobile: 1, role: 1, profile_image: 1, companyName: { $ifNull: ["$profile.companyName", ""] } } }
                    ]
                }
            },
            { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "items.creatorId",
                    foreignField: "_id",
                    as: "items.creatorId",
                    pipeline: [{ $project: { userName: 1, email: 1, mobile: 1, role: 1, profile_image: 1 } }]
                }
            },
            { $unwind: { path: "$items.creatorId", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "services",
                    localField: "items.serviceId",
                    foreignField: "_id",
                    as: "items.serviceId",
                    pipeline: [
                        {
                            $lookup: {
                                from: "platforms",
                                localField: "platform",
                                foreignField: "_id",
                                as: "platform"
                            }
                        },
                        { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "servicemasters",
                                localField: "serviceType",
                                foreignField: "_id",
                                as: "serviceType"
                            }
                        },
                        { $unwind: { path: "$serviceType", preserveNullAndEmptyArrays: true } }
                    ]
                }
            },
            { $unwind: { path: "$items.serviceId", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id",
                    orderId: { $first: "$orderId" },
                    brandId: { $first: "$brandId" },
                    totalAmount: { $first: "$totalAmount" },
                    paymentStatus: { $first: "$paymentStatus" },
                    paymentMethod: { $first: "$paymentMethod" },
                    transactionId: { $first: "$transactionId" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    items: { $push: "$items" }
                }
            }
        ]);

        const order = orderArray[0];

        if (!order) {
            return {
                statusCode: statusCode.DATA_NOT_FOUND,
                success: false,
                message: "Order not found",
            };
        }

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Order details retrieved successfully",
            data: order,
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
