const mongoose = require("mongoose");

const escrowSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["holding", "released", "refunded"],
      default: "holding",
    },
    releasedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
    releaseTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    creatorAmount: {
      type: Number,
      default: 0,
    },
    platformFeeTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
  },
  { timestamps: true, versionKey: false }
);

const Escrow = mongoose.model("escrow", escrowSchema);

module.exports = Escrow;
