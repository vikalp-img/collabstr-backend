const mongoose = require("mongoose");

/**
 * CMS Model for static pages like Terms of Service, Privacy Policy, etc.
 */

const TYPES = [
  "privacy_policy",
  "terms_conditions",
  "about_us",
  "cookie_policy",
  "return_policy"
];
const cmsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TYPES,
      required: true,
    },

    content: { type: String },
  },

  { timestamps: true },
);

const CMS = mongoose.model("cms", cmsSchema);

module.exports = CMS;