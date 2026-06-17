const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    items: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "service",
          required: true,
        },
        creatorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: [
            "pending",
            "accepted",
            "rejected",
            "reviewing",
            "revision",
            "completed",
            "dispute",
          ],
          default: "pending",
        },
        revisionCount: {
          type: Number,
          default: 0,
        },
        actionReason: {
          type: String,
        },
        deliveredAt: {
          type: Date,
        },
        escrowStatus: {
          type: String,
          enum: ["none", "holding", "released", "refunded"],
          default: "none",
        },
        escrowId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "escrow",
        },
        totalPrice: {
          type: Number,
        },
        platformFee: {
          type: Number,
        },
        rejectionMessage: {
          type: String,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed", "escrow"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      default: "wallet",
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
  },
  { timestamps: true, versionKey: false }
);

const Order = mongoose.model("order", orderSchema);

module.exports = Order;
