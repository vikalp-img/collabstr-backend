const mongoose = require("mongoose");


const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
    },
    image: {
      url: { type: String },
      public_id: { type: String },
      resource_type: { type: String, default: "image" },
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;
