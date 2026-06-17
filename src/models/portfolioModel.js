const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    media: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
      resource_type: { type: String, default: "image" },
      provider: { type: String, default: "" }
    }
  },
  { timestamps: true, versionKey: false }
);

const Portfolio = mongoose.model("portfolio", portfolioSchema);

module.exports = Portfolio;
