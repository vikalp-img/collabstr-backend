const mongoose = require("mongoose");

/**
 * Usage Model tracks the consumption of plan features by brands.
 * Resets per subscription period or month as configured in the plan.
 */
const usageSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subscription",
      required: false,
    },
    featureName: {
      type: String, // e.g., "Profile Access", "Hire Creator", "Search & Discovery"
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    lastReset: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, versionKey: false }
);

// Indexing for faster usage checks
usageSchema.index({ brandId: 1, subscriptionId: 1, featureName: 1 }, { unique: true });

const Usage = mongoose.model("usage", usageSchema);

module.exports = Usage;
