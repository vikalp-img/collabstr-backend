const mongoose = require("mongoose");

/**
 * Plan Model defines the subscription tiers available for brands.
 */
const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    duration: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    platform_fee_percentage: {
      type: Number,
      default: 10,
    },
    features: [
      {
        featureId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "feature",
          required: true,
        },
        limit: {
          type: Number,
          default: -1, // -1 means unlimited
        },
        value: {
          type: String,
          default: "",
        },
      },
    ],
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const Plan = mongoose.model("plan", planSchema);

module.exports = Plan;
