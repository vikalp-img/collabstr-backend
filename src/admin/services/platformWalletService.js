const platformWalletModel = require("../../models/platformWalletModel");
const mongoose = require("mongoose");
const escrowModel = require("../../models/escrowModel");
const transactionModel = require("../../models/transactionModel");
const walletModel = require("../../models/walletModel");

const { statusCode } = require("../../config/default.json");


const getOrCreateWallet = async () => {
  let wallet = await platformWalletModel.findOne({});
  if (!wallet) {
    wallet = await platformWalletModel.create({});
  }
  return wallet;
};


exports.getPlatformWallet = async (query = {}) => {
  try {
    const { status, page = 1, limit = 10 } = query;
    const wallet = await getOrCreateWallet();

    // 1. Live escrow held: sum of all escrow records still in "holding"
    const [holdingAgg] = await escrowModel.aggregate([
      { $match: { status: "holding" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const liveEscrowHeld = holdingAgg ? holdingAgg.total : 0;

    // Update the escrowHeld field to stay in sync
    await platformWalletModel.findOneAndUpdate(
      {},
      { escrowHeld: liveEscrowHeld },
      { upsert: true }
    );

    // 2. Fetch Escrow List (Recent Activities)
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const totalEscrows = await escrowModel.countDocuments(filter);

    const escrows = await escrowModel.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "orderId",
          pipeline: [{ $project: { orderId: 1, totalAmount: 1, paymentStatus: 1 } }]
        }
      },
      { $unwind: { path: "$orderId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "brandId",
          foreignField: "_id",
          as: "brandId",
          pipeline: [{ $project: { userName: 1, email: 1 } }]
        }
      },
      { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "_id",
          as: "creatorId",
          pipeline: [{ $project: { userName: 1, email: 1 } }]
        }
      },
      { $unwind: { path: "$creatorId", preserveNullAndEmptyArrays: true } }
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      data: {
        stats: {
          balance: wallet.balance,
          totalEarned: wallet.totalEarned,
          escrowHeld: liveEscrowHeld,
          totalEscrowProcessed: wallet.totalEscrowProcessed,
        },
        escrows: {
          total: totalEscrows,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalEscrows / Number(limit)),
          data: escrows,
        }
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


exports.getPlatformTransactions = async ({ page = 1, limit = 20 }) => {
  try {
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { source: "platform_commission" };
    const total = await transactionModel.countDocuments(filter);

    const transactions = await transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return {
      statusCode: statusCode.OK,
      success: true,
      data: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
        transactions,
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

exports.deposit = async (adminId, { amount, description }) => {
  try {
    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      throw new Error("Deposit amount must be greater than 0");
    }

    const wallet = await getOrCreateWallet();
    const openingBalance = wallet.balance;
    wallet.balance = Math.round((openingBalance + depositAmount) * 100) / 100;
    // We don't increment totalEarned here as it's a deposit, not an earned commission
    await wallet.save();

    const transaction = new transactionModel({
      userId: adminId,
      amount: depositAmount,
      transactionId: "TXN_PLATFORM_DEP_" + Date.now(),
      type: "credit",
      paymentStatus: "success",
      openingBalance,
      closingBalance: wallet.balance,
      source: "admin_deposit",
    });
    await transaction.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: `${depositAmount} deposited into platform wallet successfully`,
      data: {
        amount: depositAmount,
        newBalance: wallet.balance,
        transactionId: transaction.transactionId,
        description: description || "Admin platform deposit",
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

exports.depositToUserWallet = async (adminId, { userId, amount, description }) => {
  try {
    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      throw new Error("Deposit amount must be greater than 0");
    }

    if (!userId) {
      throw new Error("User ID is required for user wallet deposit");
    }

    let wallet = await walletModel.findOne({ userId });
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await walletModel.create({ userId, balance: 0 });
    }

    const openingBalance = wallet.balance || 0;
    wallet.balance = Math.round((openingBalance + depositAmount) * 100) / 100;
    await wallet.save();

    const transaction = new transactionModel({
      userId: userId, // The transaction belongs to the user
      adminId: adminId, // Added to track who did it
      amount: depositAmount,
      transactionId: "TXN_USER_DEP_" + Date.now(),
      type: "credit",
      paymentStatus: "success",
      openingBalance,
      closingBalance: wallet.balance,
      source: "admin_deposit",
    });
    await transaction.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: `${depositAmount} deposited into user wallet successfully`,
      data: {
        amount: depositAmount,
        newBalance: wallet.balance,
        transactionId: transaction.transactionId,
        description: description || "Admin user deposit",
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

