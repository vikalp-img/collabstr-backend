const mongoose = require("mongoose");

/**
 * Subscription Model tracks the plans purchased by brands.
 * Supports stacking: multiple subscriptions can exist, with sequential start/end dates.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "plan",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "pending",
    },
    lastPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
  },
  { timestamps: true, versionKey: false }
);

// Indexing for faster lookups
subscriptionSchema.index({ brandId: 1, status: 1 });
subscriptionSchema.index({ brandId: 1, startDate: 1 });
subscriptionSchema.index({ endDate: 1 });

const Subscription = mongoose.model("subscription", subscriptionSchema);

module.exports = Subscription;
