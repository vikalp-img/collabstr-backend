const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "favoriteList",
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Ensure a creator is only favorited once per list
favoriteSchema.index({ userId: 1, creatorId: 1, listId: 1 }, { unique: true });

const Favorite = mongoose.model("favorite", favoriteSchema);

module.exports = Favorite;
