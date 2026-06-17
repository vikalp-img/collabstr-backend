const transactionModel = require("../../models/transactionModel");
const mongoose = require("mongoose");
const userModel = require("../../models/userModel");
const { statusCode, resMessage } = require("../../config/default.json");

exports.getAllTransactions = async (query) => {
    try {
        const {
            search = "",
            page = 1,
            limit = 10,
            type,
            source,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;

        const filter = {};

        // Type filter
        if (type && type !== "all") {
            filter.type = type;
        }

        // Source filter
        if (source && source !== "all") {
            filter.source = source;
        }

        // Search by Transaction ID or User Info
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search.trim(), "i");
            
            // If it looks like a Transaction ID
            if (search.startsWith("TXN")) {
                filter.transactionId = searchRegex;
            } else {
                // Search by User (need to find user IDs first)
                const matchedUsers = await userModel.find({
                    $or: [
                        { userName: searchRegex },
                        { email: searchRegex }
                    ]
                }).select("_id").lean();
                
                const userIds = matchedUsers.map(u => u._id);
                filter.userId = { $in: userIds };
            }
        }

        // Stats calculation
        const statsAggregation = await transactionModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    totalCredit: {
                        $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }
                    },
                    totalDebit: {
                        $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }
                    }
                }
            }
        ]);

        const stats = statsAggregation[0] || {
            totalCount: 0,
            totalCredit: 0,
            totalDebit: 0
        };

        const skipCount = (Number(page) - 1) * Number(limit);
        const sortObj = {};
        sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

        const results = await transactionModel.aggregate([
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
                                localField: "userId",
                                foreignField: "_id",
                                as: "userId",
                                pipeline: [{ $project: { userName: 1, email: 1, mobile: 1, role: 1 } }]
                            }
                        },
                        { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } }
                    ]
                }
            }
        ]);

        const totalCount = results[0].metadata[0] ? results[0].metadata[0].total : 0;
        const transactions = results[0].data;

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Transactions retrieved successfully",
            data: {
                transactions,
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

exports.getTransactionDetails = async (id) => {
    try {
        const transactionArray = await transactionModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userId",
                    pipeline: [{ $project: { userName: 1, email: 1, mobile: 1, role: 1 } }]
                }
            },
            { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } }
        ]);

        const transaction = transactionArray[0];

        if (!transaction) {
            return {
                statusCode: statusCode.DATA_NOT_FOUND,
                success: false,
                message: "Transaction not found",
            };
        }

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Transaction details retrieved successfully",
            data: transaction,
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
