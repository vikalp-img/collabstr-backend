const mongoose = require("mongoose");

/**
 * Feature Model defines the capabilities or limits that can be part of a plan.
 */
const featureSchema = new mongoose.Schema(
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
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const Feature = mongoose.model("feature", featureSchema);

module.exports = Feature;
