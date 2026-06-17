const orderModel = require("../../models/orderModel");
const userModel = require("../../models/userModel");
const walletModel = require("../../models/walletModel");
const transactionModel = require("../../models/transactionModel");
const escrowModel = require("../../models/escrowModel");
const platformWalletModel = require("../../models/platformWalletModel");
const { statusCode, platformCommission } = require("../../config/default.json");
const subscriptionService = require("../../app/services/subscriptionService");


exports.getAllDisputes = async (query) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
        } = query;

        const skip = (Number(page) - 1) * Number(limit);
        const limitNum = Number(limit);

        // Filter for items with status 'dispute'
        const matchQuery = { "items.status": "dispute" };

        if (search && search.trim() !== "") {
            matchQuery.orderId = new RegExp(search.trim(), "i");
        }

        const pipeline = [
            { $unwind: "$items" },
            { $match: { "items.status": "dispute" } }
        ];

        if (search && search.trim() !== "") {
             pipeline.push({ $match: { "orderId": new RegExp(search.trim(), "i") } });
        }

        // Stats calculation (total pending disputes)
        const stats = {
            totalPendingDisputes: await orderModel.countDocuments({ "items.status": "dispute" }),
            // More stats can be added if we track resolution history
        };

        const [disputes, totalCountResult] = await Promise.all([
            orderModel.aggregate([
                ...pipeline,
                {
                    $lookup: {
                        from: "users",
                        localField: "brandId",
                        foreignField: "_id",
                        as: "brand"
                    }
                },
                { $unwind: "$brand" },
                {
                    $lookup: {
                        from: "users",
                        localField: "items.creatorId",
                        foreignField: "_id",
                        as: "creator"
                    }
                },
                { $unwind: "$creator" },
                {
                    $lookup: {
                        from: "services",
                        localField: "items.serviceId",
                        foreignField: "_id",
                        as: "service"
                    }
                },
                { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
                { $sort: { updatedAt: -1 } },
                { $skip: skip },
                { $limit: limitNum },
                {
                    $project: {
                        _id: 1,
                        orderId: 1,
                        brand: { _id: 1, userName: 1, email: 1 },
                        item: {
                            _id: "$items._id",
                            status: "$items.status",
                            price: "$items.price",
                            totalPrice: "$items.totalPrice",
                            actionReason: "$items.actionReason",
                            deliveredAt: "$items.deliveredAt",
                            escrowStatus: "$items.escrowStatus",
                            escrowId: "$items.escrowId",
                            creator: { _id: "$creator._id", userName: "$creator.userName", email: "$creator.email" },
                            service: { _id: "$service._id", title: "$service.title" }
                        }
                    }
                }
            ]),
            orderModel.aggregate([
                ...pipeline,
                { $count: "total" }
            ])
        ]);

        const totalCount = totalCountResult[0] ? totalCountResult[0].total : 0;

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Disputes retrieved successfully",
            data: {
                disputes,
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

exports.resolveDispute = async (orderId, itemId, payload) => {
    try {
        const { action, message } = payload; // action: 'release' or 'refund'

        if (!["release", "refund"].includes(action)) {
            throw new Error("Invalid resolution action. Use 'release' or 'refund'.");
        }

        const order = await orderModel.findById(orderId);
        if (!order) throw new Error("Order not found");

        const item = order.items.id(itemId);
        if (!item) throw new Error("Order item not found");

        if (item.status !== "dispute") {
            throw new Error(`Item is not in dispute (current status: ${item.status})`);
        }

        if (item.escrowStatus !== "holding") {
            throw new Error(`Escrow is not in 'holding' state (current: ${item.escrowStatus})`);
        }

        const escrow = await escrowModel.findById(item.escrowId);
        if (!escrow || escrow.status !== "holding") throw new Error("Escrow record not found or not in holding");

        const totalAmount = Number(escrow.amount) || 0;

        if (action === "release") {
            // RELEASE TO CREATOR (similar to reviewDelivery->completed)
            // Platform fee was already taken during purchase
            const creatorAmount = totalAmount;

            const creatorWallet = await walletModel.findOne({ userId: item.creatorId });
            if (!creatorWallet) throw new Error("Creator wallet not found");

            const creatorOpening = Number(creatorWallet.balance) || 0;
            creatorWallet.balance = Math.round((creatorOpening + creatorAmount) * 100) / 100;
            await creatorWallet.save();

            const creatorTxn = new transactionModel({
                userId: item.creatorId,
                amount: creatorAmount,
                transactionId: "TXN_DISP_REL_" + Date.now(),
                type: "credit",
                paymentStatus: "success",
                openingBalance: creatorOpening,
                closingBalance: creatorWallet.balance,
                source: "escrow_release",
            });
            await creatorTxn.save();

            const platformWallet = await platformWalletModel.findOneAndUpdate(
                {},
                {
                    $inc: {
                        escrowHeld: -totalAmount,
                        totalEscrowProcessed: totalAmount,
                    },
                },
                { new: true, upsert: true }
            );

            escrow.status = "released";
            escrow.releasedAt = new Date();
            escrow.creatorAmount = creatorAmount;
            escrow.releaseTransactionId = creatorTxn._id;
            await escrow.save();

            item.escrowStatus = "released";
            item.status = "completed";
            item.actionReason = message || "Dispute resolved in favor of creator.";
            await order.save();

            return {
                statusCode: statusCode.OK,
                success: true,
                message: `Dispute resolved: Released to creator. Creator received ${creatorAmount}, Platform received ${escrow.platformFee}.`,
            };
        } else {
            // REFUND TO BRAND (similar to reviewDelivery->rejected)
            const brandWallet = await walletModel.findOne({ userId: order.brandId });
            if (!brandWallet) throw new Error("Brand wallet not found");

            const oldBalance = Number(brandWallet.balance) || 0;
            brandWallet.balance = oldBalance + totalAmount;
            await brandWallet.save();

            const refundTxn = new transactionModel({
                userId: order.brandId,
                amount: totalAmount,
                transactionId: "TXN_DISP_REF_" + Date.now(),
                type: "credit",
                paymentStatus: "success",
                openingBalance: oldBalance,
                closingBalance: brandWallet.balance,
                source: "escrow_refund",
            });
            await refundTxn.save();

            escrow.status = "refunded";
            escrow.refundedAt = new Date();
            escrow.releaseTransactionId = refundTxn._id;
            await escrow.save();

            await platformWalletModel.findOneAndUpdate(
                {},
                { $inc: { escrowHeld: -totalAmount, totalEscrowProcessed: totalAmount } },
                { upsert: true }
            );

            item.escrowStatus = "refunded";
            item.status = "rejected";
            item.rejectionMessage = message || "Dispute resolved in favor of brand. Refund issued.";
            await order.save();

            return {
                statusCode: statusCode.OK,
                success: true,
                message: "Dispute resolved: Funds refunded to brand",
            };
        }
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
