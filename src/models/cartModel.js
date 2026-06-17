const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
    },
    items: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "service",
          required: true,
        },
        title: String,
        description: String,
        price: Number,
        quantity: {
          type: Number,
          default: 1,
        },
        deliveryTime: Number,
        creatorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        creatorName: String,
        creatorImage: String,
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

const Cart = mongoose.model("cart", cartSchema);

module.exports = Cart;
