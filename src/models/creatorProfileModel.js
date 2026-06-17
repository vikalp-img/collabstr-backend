const mongoose = require("mongoose");

const creatorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000
    },

    gender: {
      type: String,
      default: ""
    },

    dob: {
      type: Date,
      default: null,
    },

    ethnicity: {
      type: String,
      default: "",
      trim: true
    },

    category: {
      // e.g. "Fashion", "Tech", "Gaming", "Food"
      type: [String],
      default: [],
    },

    languages: {
      type: [String],
      default: [],
    },

    location: {
      address: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
      country: { type: String, default: "", trim: true }
    },

    approvalStatus: {
      // 0 = pending, 1 = approved, 2 = rejected
      type: Number,
      default: 0,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
    rejectReason: {
      type: String,
      default: "",
    },
    isTopCreator: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true, versionKey: false }
);

const CreatorProfile = mongoose.model("creatorProfile", creatorProfileSchema);

module.exports = CreatorProfile;