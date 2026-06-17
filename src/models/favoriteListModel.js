const mongoose = require("mongoose");

const favoriteListSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    }
  },
  { timestamps: true, versionKey: false }
);

const FavoriteList = mongoose.model("favoriteList", favoriteListSchema);

module.exports = FavoriteList;
