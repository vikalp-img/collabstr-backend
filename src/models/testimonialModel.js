const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      trim: true,
    },
    userImage: {
      url: { type: String },
      public_id: { type: String },
      resource_type: { type: String, default: "image" }
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const testimonial = mongoose.model("testimonial", testimonialSchema);

module.exports = testimonial;
