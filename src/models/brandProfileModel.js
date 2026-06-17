const mongoose = require("mongoose");

/**
 * BrandProfile holds all brand/company-specific details.
 */
const brandProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
    },
    location: {
      address: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
      country: { type: String, default: "", trim: true },
    },
    cover_image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
      provider: { type: String, default: "cloudinary" },
    },
    socialAccounts: {
      website: { type: String, default: "" },
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      twitter: { type: String, default: "" }
    }
  },
  { timestamps: true, versionKey: false }
);

const BrandProfile = mongoose.model("brandProfile", brandProfileSchema);

module.exports = BrandProfile;
