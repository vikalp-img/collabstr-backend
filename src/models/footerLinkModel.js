const mongoose = require("mongoose");

const footerLinkSchema = new mongoose.Schema(
  {
    email: {
      value: { type: String, trim: true, default: "" },
      isActive: { type: Boolean, default: true },
    },
    phone: {
      value: { type: String, trim: true, default: "" },
      isActive: { type: Boolean, default: true },
    },
    address: {
      value: { type: String, trim: true, default: "" },
      isActive: { type: Boolean, default: true },
    },
    socialLinks: [
      {
        platform: {
          type: String,
          trim: true,
          enum: ["instagram", "youtube", "tiktok", "twitter", "linkedin", "facebook"],
        },
        url: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

const footerLink = mongoose.model("footerLink", footerLinkSchema);

module.exports = footerLink;
