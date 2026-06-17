const orderModel = require("../../models/orderModel");
const cartModel = require("../../models/cartModel");
const walletModel = require("../../models/walletModel");
const transactionModel = require("../../models/transactionModel");
const escrowModel = require("../../models/escrowModel");
const platformWalletModel = require("../../models/platformWalletModel");
const { statusCode, platformCommission } = require("../../config/default.json");
const { uploadToCloudinary } = require("../../helpers/uploadToCloudinary");
const mongoose = require("mongoose");

const subscriptionService = require("./subscriptionService");

const generateOrderId = () => {
  return "ORD" + Date.now() + Math.floor(Math.random() * 1000);
};

exports.placeOrder = async (userId) => {
  try {
    // 0.1 Fetch active plan and commission rate
    const activeSub = await subscriptionService.getActiveSubscription(userId);
    const feePercentage = (activeSub && activeSub.planId && activeSub.planId.platform_fee_percentage !== undefined)
      ? activeSub.planId.platform_fee_percentage
      : (platformCommission * 100);

    const cart = await cartModel.findOne({ userId });
    if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

    let totalBaseAmount = 0;
    let totalPlatformFee = 0;

    const orderItems = cart.items.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const itemBaseTotal = price * quantity;

      const itemPlatformFee = Math.round(itemBaseTotal * (feePercentage / 100) * 100) / 100;

      totalBaseAmount += itemBaseTotal;
      totalPlatformFee += itemPlatformFee;

      return {
        serviceId: item.serviceId,
        creatorId: item.creatorId,
        quantity,
        price,
        totalPrice: itemBaseTotal, // This is what the creator sees as their base payout
        platformFee: itemPlatformFee, // Store pre-calculated fee
        status: "pending",
      };
    });

    const totalOrderAmount = Math.round((totalBaseAmount + totalPlatformFee) * 100) / 100;

    const wallet = await walletModel.findOne({ userId });
    if (!wallet || wallet.balance < totalOrderAmount) {
      throw new Error(`Insufficient wallet balance. Total required: ${totalOrderAmount} (Service: ${totalBaseAmount}, Fee: ${totalPlatformFee})`);
    }

    // 1. Deduct total (Base + Fee) from wallet
    const openingBalance = Number(wallet.balance) || 0;
    wallet.balance = Math.round((openingBalance - totalOrderAmount) * 100) / 100;
    const closingBalance = wallet.balance;
    await wallet.save();

    // 2. Create Transaction for Brand
    const transaction = new transactionModel({
      userId,
      amount: totalOrderAmount,
      transactionId: "TXN" + Date.now(),
      type: "debit",
      paymentStatus: "success",
      openingBalance,
      closingBalance,
      source: "service_purchase",
    });
    await transaction.save();

    // 3. Collect platform fee immediately
    const platformWallet = await platformWalletModel.findOneAndUpdate(
      {},
      {
        $inc: {
          balance: totalPlatformFee,
          totalEarned: totalPlatformFee,
        }
      },
      { new: true, upsert: true }
    );

    const platformTxn = new transactionModel({
      userId, // Brand paid the fee
      amount: totalPlatformFee,
      transactionId: "TXN_PLATFORM_FEE_" + Date.now(),
      type: "debit",
      paymentStatus: "success",
      openingBalance: 0,
      closingBalance: platformWallet.balance,
      source: "platform_commission",
    });
    await platformTxn.save();

    // 4. Create Order
    const order = new orderModel({
      orderId: generateOrderId(),
      brandId: userId,
      items: orderItems,
      totalAmount: totalOrderAmount, // Total brand paid
      paymentStatus: "escrow",
      paymentMethod: "wallet",
      transactionId: transaction._id,
    });
    await order.save();

    // 5. Create Escrow records (Base Amount Only)
    for (let item of order.items) {
      const escrow = new escrowModel({
        orderId: order._id,
        brandId: userId,
        creatorId: item.creatorId,
        amount: item.totalPrice, // Base price for creator
        platformFee: item.platformFee, // Recorded fee
        status: "holding",
        transactionId: transaction._id,
      });
      await escrow.save();

      // Update item with escrow details
      item.escrowId = escrow._id;
      item.escrowStatus = "holding";
    }
    await order.save();

    // 6. Track escrow held (Only the portion the creator will get)
    await platformWalletModel.findOneAndUpdate(
      {},
      { $inc: { escrowHeld: totalBaseAmount } },
      { upsert: true }
    );

    // 6. Clear Cart
    await cartModel.findOneAndDelete({ userId });

    // 7. Log activity for subscription tracking
    await subscriptionService.logActivity(userId, "hire");

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Order placed successfully and funds held in escrow",
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

exports.getOrders = async (userId, role, queryOptions = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      startDate,
      endDate,
    } = queryOptions;

    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Number(limit);

    let matchQuery = {};
    if (role === "brand") {
      matchQuery.brandId = new mongoose.Types.ObjectId(userId);
    } else if (role === "creator") {
      matchQuery["items.creatorId"] = new mongoose.Types.ObjectId(userId);
    } else {
      throw new Error("Invalid role");
    }

    // Date filter
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchQuery.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    let pipeline = [
      { $match: matchQuery },
      { $unwind: "$items" },
    ];

    // For creators, only show their items
    if (role === "creator") {
      pipeline.push({
        $match: { "items.creatorId": new mongoose.Types.ObjectId(userId) }
      });
    }

    // Filter by Item Status
    if (status) {
      pipeline.push({ $match: { "items.status": status } });
    }

    // Lookup Brand details
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "brandId",
          foreignField: "_id",
          as: "brandDetails"
        }
      },
      { $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "brandprofiles",
          localField: "brandId",
          foreignField: "userId",
          as: "brandProfile"
        }
      },
      { $unwind: { path: "$brandProfile", preserveNullAndEmptyArrays: true } }
    );

    // Lookup Creator details
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "items.creatorId",
          foreignField: "_id",
          as: "creatorDetails"
        }
      },
      { $unwind: { path: "$creatorDetails", preserveNullAndEmptyArrays: true } }
    );

    // Search by Name
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "brandDetails.userName": { $regex: search, $options: "i" } },
            { "brandDetails.companyName": { $regex: search, $options: "i" } },
            { "creatorDetails.userName": { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    // Lookup Service Details
    pipeline.push(
      {
        $lookup: {
          from: "services",
          localField: "items.serviceId",
          foreignField: "_id",
          as: "serviceDetails"
        }
      },
      { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } }
    );

    // Populate Master Service Type and Platform
    pipeline.push(
      {
        $lookup: {
          from: "servicemasters",
          localField: "serviceDetails.serviceType",
          foreignField: "_id",
          as: "master"
        }
      },
      { $unwind: { path: "$master", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "platforms",
          localField: "serviceDetails.platform",
          foreignField: "_id",
          as: "platform"
        }
      },
      { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } }
    );

    // Lookup Review Details
    pipeline.push(
      {
        $lookup: {
          from: "reviews",
          localField: "items._id",
          foreignField: "itemId",
          as: "reviewDetails"
        }
      },
      {
        $unwind: { path: "$reviewDetails", preserveNullAndEmptyArrays: true }
      }
    );

    // Final Project and Facet for Pagination
    pipeline.push(
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                orderId: 1,
                createdAt: 1,
                totalAmount: 1,
                paymentStatus: 1,
                paymentMethod: 1,
                brandDetails: {
                  _id: "$brandDetails._id",
                  userName: "$brandDetails.userName",
                  companyName: { $ifNull: ["$brandProfile.companyName", ""] },
                  email: "$brandDetails.email",
                  profile_image: "$brandDetails.profile_image"
                },
                item: {
                  _id: "$items._id",
                  serviceId: {
                    _id: "$serviceDetails._id",
                    description: "$serviceDetails.description",
                    price: "$serviceDetails.price",
                    deliveryTime: "$serviceDetails.deliveryTime",
                    platform: "$platform",
                    serviceType: "$master"
                  },
                  creatorDetails: {
                    _id: "$creatorDetails._id",
                    userName: "$creatorDetails.userName",
                    companyName: "$creatorDetails.companyName",
                    email: "$creatorDetails.email",
                    profile_image: "$creatorDetails.profile_image"
                  },
                  quantity: "$items.quantity",
                  price: "$items.price",
                  status: "$items.status",
                  revisionCount: { $ifNull: ["$items.revisionCount", 0] },
                  actionReason: { $ifNull: ["$items.actionReason", ""] },
                  escrowStatus: "$items.escrowStatus",
                  deliveryMessage: "$items.deliveryMessage",
                  rejectionMessage: "$items.rejectionMessage",
                  totalPrice: "$items.totalPrice",
                  isReviewed: { $cond: [{ $ifNull: ["$reviewDetails", false] }, true, false] },
                  review: {
                    $cond: [
                      { $ifNull: ["$reviewDetails", false] },
                      {
                        _id: "$reviewDetails._id",
                        rating: "$reviewDetails.rating",
                        comment: "$reviewDetails.comment",
                        createdAt: "$reviewDetails.createdAt"
                      },
                      null
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    );

    const result = await orderModel.aggregate(pipeline);
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const orders = result[0].data;

    return {
      statusCode: statusCode.OK,
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
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

exports.getOrderById = async (orderId, userId, role) => {
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
            { $project: { userName: 1, email: 1, companyName: { $ifNull: ["$profile.companyName", ""] } } }
          ]
        }
      },
      { $unwind: "$brandId" },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "users",
          localField: "items.creatorId",
          foreignField: "_id",
          as: "items.creatorId",
          pipeline: [{ $project: { userName: 1, email: 1 } }]
        }
      },
      { $unwind: "$items.creatorId" },
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
                as: "platform",
                pipeline: [{ $project: { name: 1, icon: 1 } }]
              }
            },
            { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "servicemasters",
                localField: "serviceType",
                foreignField: "_id",
                as: "serviceType",
                pipeline: [{ $project: { title: 1 } }]
              }
            },
            { $unwind: { path: "$serviceType", preserveNullAndEmptyArrays: true } },
            { $project: { platform: 1, serviceType: 1, description: 1, deliveryTime: 1, price: 1 } }
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

    if (!order) throw new Error("Order not found");

    // Permission check
    const isBrand = order.brandId._id.toString() === userId.toString();
    const involvedItems = order.items.filter(
      (item) => item.creatorId._id.toString() === userId.toString()
    );

    if (role === "brand" && !isBrand) throw new Error("Unauthorized access to this order");
    if (role === "creator" && involvedItems.length === 0) throw new Error("Unauthorized access to this order");

    let result = order;
    if (role === "creator") {
      result.items = involvedItems;
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateOrderItemStatus = async (orderId, itemId, status, creatorId, message) => {
  try {
    const order = await orderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    const item = order.items.id(itemId);
    if (!item) throw new Error("Order item not found");

    if (item.creatorId.toString() !== creatorId.toString()) {
      throw new Error("Unauthorized to update this order item");
    }

    // Block setting status to 'reviewing' directly via this endpoint
    if (status === "reviewing") {
      throw new Error("Please use the 'deliver' endpoint to submit delivery files and mark as reviewing.");
    }

    // Capture old status for validation
    const oldStatus = item.status;

    // Basic status transition guard (cannot move from final states)
    // Exception: Allow moving to 'dispute' from active states like 'reviewing'
    const finalStates = ["completed", "rejected", "dispute"];
    if (finalStates.includes(oldStatus)) {
      throw new Error(`Cannot update status from final state '${oldStatus}'`);
    }

    if (oldStatus === "reviewing" && status !== "dispute") {
      throw new Error(`Item is currently 'reviewing'. You can only move it to 'dispute' from this state.`);
    }

    item.status = status;
    if (message) {
      item.actionReason = message;
    }

    // 2. REJECTION -> AUTO REFUND
    if (status === "rejected" && item.escrowStatus === "holding") {
      const escrow = await escrowModel.findById(item.escrowId);
      if (escrow && escrow.status === "holding") {
        const brandWallet = await walletModel.findOne({ userId: order.brandId });
        if (brandWallet) {
          const openingBalance = Number(brandWallet.balance) || 0;
          brandWallet.balance = openingBalance + (Number(item.totalPrice) || 0);
          const closingBalance = brandWallet.balance;
          await brandWallet.save();


          const transaction = new transactionModel({
            userId: order.brandId,
            amount: Number(item.totalPrice) || 0,
            transactionId: "TXN_AUTO_REF" + Date.now(),
            type: "credit",
            paymentStatus: "success",
            openingBalance,
            closingBalance,
            source: "escrow_refund",
          });
          await transaction.save();

          escrow.status = "refunded";
          escrow.refundedAt = new Date();
          escrow.releaseTransactionId = transaction._id;
          await escrow.save();

          // 3. Update Platform Wallet (Decrement Escrow Held)
          await platformWalletModel.findOneAndUpdate(
            {},
            { $inc: { escrowHeld: -(Number(item.totalPrice) || 0), totalEscrowProcessed: Number(item.totalPrice) || 0 } },
            { upsert: true }
          );

          item.escrowStatus = "refunded";
        }
      }
    }

    await order.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: `Item status updated to ${status}${item.escrowStatus !== 'holding' ? ' (Escrow updated)' : ''}`,
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

exports.refundEscrow = async (orderId, itemId, requesterId, role) => {
  try {
    const order = await orderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    const item = order.items.id(itemId);
    if (!item) throw new Error("Order item not found");

    // For manual refund endpoint, only the brand can trigger (cancellation)
    if (role === "brand" && order.brandId.toString() !== requesterId.toString()) {
      throw new Error("Unauthorized brand requester");
    }

    // Creator should use updateOrderItemStatus(..., 'rejected') instead of this endpoint
    if (role !== "brand") {
      throw new Error("Only brands can manually trigger a refund/cancellation");
    }

    if (item.escrowStatus !== "holding") {
      throw new Error(`Escrow is in ${item.escrowStatus} state, cannot refund`);
    }

    const escrow = await escrowModel.findById(item.escrowId);
    if (!escrow || escrow.status !== "holding") throw new Error("Escrow record not found or not in holding");

    // 1. Refund Brand Wallet
    const brandWallet = await walletModel.findOne({ userId: order.brandId });
    if (brandWallet) {
      const openingBalance = Number(brandWallet.balance) || 0;
      brandWallet.balance = openingBalance + (Number(item.totalPrice) || 0);
      const closingBalance = brandWallet.balance;
      await brandWallet.save();

      // 2. Create Refund Transaction
      const transaction = new transactionModel({
        userId: order.brandId,
        amount: Number(item.totalPrice) || 0,
        transactionId: "TXN_REF" + Date.now(),
        type: "credit",
        paymentStatus: "success",
        openingBalance,
        closingBalance,
        source: "escrow_refund",
      });
      await transaction.save();

      // 3. Update Escrow and Order Item
      escrow.status = "refunded";
      escrow.refundedAt = new Date();
      escrow.releaseTransactionId = transaction._id;
      await escrow.save();

      item.escrowStatus = "refunded";
      item.status = "rejected";

      // 4. Update Platform Wallet (Decrement Escrow Held)
      await platformWalletModel.findOneAndUpdate(
        {},
        { $inc: { escrowHeld: -(Number(item.totalPrice) || 0), totalEscrowProcessed: Number(item.totalPrice) || 0 } },
        { upsert: true }
      );

      await order.save();
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Escrow funds refunded and order item cancelled successfully",
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deliverOrderItem = async (orderId, itemId, creatorId, message) => {
  try {
    const order = await orderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    const item = order.items.id(itemId);
    if (!item) throw new Error("Order item not found");

    if (item.creatorId.toString() !== creatorId.toString()) {
      throw new Error("Unauthorized: Only the assigned creator can deliver this item");
    }

    if (item.status !== "accepted" && item.status !== "revision") {
      throw new Error(`Item must be in 'accepted' or 'revision' status to deliver (current: ${item.status})`);
    }

    item.status = "reviewing";
    item.deliveredAt = new Date();

    await order.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: `Delivery marked as completed. Awaiting brand approval.`,
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

exports.reviewDelivery = async (orderId, itemId, brandId, status, message) => {
  try {
    const order = await orderModel.findOne({ _id: orderId, brandId });
    if (!order) throw new Error("Order not found or unauthorized");

    const item = order.items.id(itemId);
    if (!item) throw new Error("Order item not found");

    if (item.status !== "reviewing") {
      throw new Error(`Item must be in 'reviewing' status to review (current: ${item.status})`);
    }

    if (item.escrowStatus !== "holding") {
      throw new Error(`Escrow is in '${item.escrowStatus}' state, cannot process`);
    }

    const escrow = await escrowModel.findById(item.escrowId);
    if (!escrow || escrow.status !== "holding") throw new Error("Escrow not found or not in holding");

    const totalAmount = Number(escrow.amount) || 0;

    // --- CASE 1: COMPLETION (APPROVAL) ---
    if (status === "completed") {
      // The platform fee was already collected during placeOrder.
      // We release the full escrow "amount" to the creator.
      const creatorAmount = totalAmount;

      // 1. Credit creator wallet
      const creatorWallet = await walletModel.findOne({ userId: item.creatorId });
      if (!creatorWallet) throw new Error("Creator wallet not found");

      const creatorOpening = Number(creatorWallet.balance) || 0;
      creatorWallet.balance = Math.round((creatorOpening + creatorAmount) * 100) / 100;
      await creatorWallet.save();

      const creatorTxn = new transactionModel({
        userId: item.creatorId,
        amount: creatorAmount,
        transactionId: "TXN_REL_" + Date.now(),
        type: "credit",
        paymentStatus: "success",
        openingBalance: creatorOpening,
        closingBalance: creatorWallet.balance,
        source: "escrow_release",
      });
      await creatorTxn.save();

      // 2. Update platform wallet escrow tracking
      await platformWalletModel.findOneAndUpdate(
        {},
        {
          $inc: {
            escrowHeld: -totalAmount,
            totalEscrowProcessed: totalAmount,
          },
        },
        { new: true, upsert: true }
      );

      // 3. Update escrow
      escrow.status = "released";
      escrow.releasedAt = new Date();
      escrow.creatorAmount = creatorAmount;
      escrow.releaseTransactionId = creatorTxn._id;
      await escrow.save();

      item.escrowStatus = "released";
      item.status = "completed";
      await order.save();

      return {
        statusCode: statusCode.OK,
        success: true,
        message: `Order completed successfully. Creator received ${creatorAmount}, Platform received ${escrow.platformFee}.`,
        data: order,
      };
    }

    // --- CASE 2: REVISION ---
    if (status === "revision") {
      const currentRevisions = item.revisionCount || 0;
      if (currentRevisions >= 2) {
        throw new Error("Maximum revision limit (2) reached. You can only approve or report this delivery.");
      }

      item.status = "revision";
      item.revisionCount = currentRevisions + 1;
      if (message) {
        item.actionReason = message;
      }
      await order.save();

      return {
        statusCode: statusCode.OK,
        success: true,
        message: `Revision requested successfully. Remaining revisions: ${1 - currentRevisions}.`,
        data: order,
      };
    }

    // --- CASE 3: DISPUTE (REPORT) ---
    if (status === "dispute") {
      item.status = "dispute";
      if (message) {
        item.actionReason = message;
      }
      await order.save();

      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Delivery has been reported and moved to dispute. Escrow remains held pending resolution.",
        data: order,
      };
    }

    // --- CASE 4: REJECTION (Admin/Force Refund) ---
    // Brands cannot reject directly via the new workflow as per rules, 
    // but in case this is called from an authorized context:
    if (status === "rejected") {
      // Refund brand full amount
      const brandWallet = await walletModel.findOne({ userId: order.brandId });
      if (!brandWallet) throw new Error("Brand wallet not found");

      const oldBalance = Number(brandWallet.balance) || 0;
      brandWallet.balance = oldBalance + totalAmount;
      await brandWallet.save();

      const refundTxn = new transactionModel({
        userId: order.brandId,
        amount: totalAmount,
        transactionId: status === "rejected" ? ("TXN_REJ_" + Date.now()) : ("TXN_DISP_" + Date.now()),
        type: "credit",
        paymentStatus: "success",
        openingBalance: oldBalance,
        closingBalance: brandWallet.balance,
        source: "escrow_refund",
      });
      await refundTxn.save();

      // Update escrow and item
      escrow.status = "refunded";
      escrow.refundedAt = new Date();
      escrow.releaseTransactionId = refundTxn._id;
      await escrow.save();

      // Decrement escrowHeld on platform wallet
      await platformWalletModel.findOneAndUpdate(
        {},
        { $inc: { escrowHeld: -totalAmount, totalEscrowProcessed: totalAmount } },
        { upsert: true }
      );

      item.escrowStatus = "refunded";
      item.status = status;
      if (status === "rejected") {
        item.rejectionMessage = message;
      }
      await order.save();

      return {
        statusCode: statusCode.OK,
        success: true,
        message: `Delivery ${status}. Full amount refunded to brand.`,
        data: order,
      };
    }

    throw new Error("Invalid review status provided");
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
