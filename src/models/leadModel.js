const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "unsubscribed"],
      default: "active",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

// Add unique index on email for faster lookups and better data integrity
leadSchema.index({ email: 1 }, { unique: true });

const Lead = mongoose.model("lead", leadSchema);

module.exports = Lead;
