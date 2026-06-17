const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    issueCategory: {
      type: String,
      enum: ["billing_payments", "account_access", "escrow_dispute", "technical_issue", "other"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

const Support = mongoose.model("support", supportSchema);

module.exports = Support;
