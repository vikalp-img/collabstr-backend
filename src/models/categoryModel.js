const mongoose = require("mongoose");

/**
 * Category Model for influencer niches or service categories.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      url: { type: String },
      public_id: { type: String },
      resource_type: { type: String, default: "image" }
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true, versionKey: false }
);

const Category = mongoose.model("category", categorySchema);

module.exports = Category;
