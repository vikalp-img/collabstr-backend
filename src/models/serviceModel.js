const mongoose = require("mongoose");

/**
 * Service represents a deliverable that a creator offers for purchase.
 */
const serviceSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    platform: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform",
      required: true,
    },

    serviceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "serviceMaster",
      required: true,
    },

    description: String,

    deliveryTime: Number,
    price: Number,
    quantity: Number,


    approvalStatus: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true, versionKey: false }
);

const Service = mongoose.model("service", serviceSchema);

module.exports = Service;
