const mongoose = require("mongoose");

/**
 * SocialAccount stores each linked social media platform for a creator.
 */
const socialAccountSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    // ✅ Link to Platform collection
    platform: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform",
      required: true,
    },

    handle: {
      type: String,
      trim: true,
      required: true,
    },

    followers: {
      type: Number,
      default: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const SocialAccount = mongoose.model("socialAccount", socialAccountSchema);

module.exports = SocialAccount;
