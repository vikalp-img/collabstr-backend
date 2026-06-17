const walletModel = require("../../models/walletModel");
const transactionModel = require("../../models/transactionModel");
const { statusCode } = require("../../config/default.json");
const mongoose = require("mongoose");

exports.getWallet = async (userId) => {
  try {
    const wallet = await walletModel.findOne({ userId }).lean();

    if (!wallet) {
      return {
        statusCode: statusCode.NOT_FOUND,
        success: false,
        message: "Wallet not found for this user",
        data: {}
      };
    }

    // Calculate Total Spend
    const spendData = await transactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          paymentStatus: "success",
        },
      },
      {
        $group: {
          _id: null,
          totalDebits: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$source",
                    ["service_purchase", "platform_commission", "plan_purchase"],
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          totalRefunds: {
            $sum: {
              $cond: [{ $eq: ["$source", "escrow_refund"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    const totalSpend = spendData.length > 0 ? (spendData[0].totalDebits - spendData[0].totalRefunds) : 0;

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Wallet fetched successfully",
      data: {
        ...wallet,
        totalSpend: Math.round(totalSpend * 100) / 100
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

exports.addFunds = async (userId, amount) => {
  try {
    let wallet = await walletModel.findOne({ userId });
    if (!wallet) throw new Error("Wallet not found");

    const openingBalance = Number(wallet.balance) || 0;
    wallet.balance = openingBalance + Number(amount);
    const closingBalance = wallet.balance;
    await wallet.save();

    const transaction = new transactionModel({
      userId,
      amount: Number(amount),
      transactionId: "TXN_ADD" + Date.now(),
      type: "credit",
      paymentStatus: "success",
      openingBalance,
      closingBalance,
      source: "user_investment"
    });
    await transaction.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Funds added successfully",
      data: wallet
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};

exports.removeFunds = async (userId, amount) => {
  try {
    let wallet = await walletModel.findOne({ userId });
    if (!wallet) throw new Error("Wallet not found");

    const openingBalance = Number(wallet.balance) || 0;
    if (openingBalance < Number(amount)) throw new Error("Insufficient wallet balance");

    wallet.balance = openingBalance - Number(amount);
    const closingBalance = wallet.balance;
    await wallet.save();

    const transaction = new transactionModel({
      userId,
      amount: Number(amount),
      transactionId: "TXN_REM" + Date.now(),
      type: "debit",
      paymentStatus: "success",
      openingBalance,
      closingBalance,
      source: "user_investment"
    });
    await transaction.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Funds removed successfully",
      data: wallet
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};
