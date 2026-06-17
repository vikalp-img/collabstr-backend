const mongoose = require("mongoose");
const transactionModel = require("../../models/transactionModel");
const { statusCode } = require("../../config/default.json");


exports.getTransactions = async (userId, query) => {
    try {
        const {
            page = 1,
            limit = 10,
            type,
            source,
            transactionId,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;

        const filter = { userId, source: { $ne: "platform_commission" } };

        // Type filter: credit or debit
        if (type && type !== "all") {
            filter.type = type;
        }

        // Source filter: user_investment, service_purchase, etc.
        if (source && source !== "all") {
            filter.source = source;
        }

        // Search by transactionId
        if (transactionId) {
            filter.transactionId = { $regex: transactionId, $options: "i" };
        }

        // Stats calculation for the specific user
        const statsAggregation = await transactionModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), source: { $ne: "platform_commission" } } },
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

        const [transactions, totalCount] = await Promise.all([
            transactionModel
                .find(filter)
                .sort(sortObj)
                .skip(skipCount)
                .limit(Number(limit))
                .lean(),
            transactionModel.countDocuments(filter),
        ]);

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
        console.error("❌ Error in getTransactions:", error);
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.getTransactionDetails = async (id, userId) => {
    try {
        const transaction = await transactionModel.findOne({ _id: id, userId }).lean();

        if (!transaction) {
            return {
                statusCode: statusCode.NOT_FOUND,
                success: false,
                message: "Transaction not found or access denied",
            };
        }

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Transaction details retrieved successfully",
            data: transaction,
        };
    } catch (error) {
        console.error("❌ Error in getTransactionDetails:", error);
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
