const Blog = require("../../models/blogModel");
const { statusCode, resMessage } = require("../../config/default.json");


exports.getBlogs = async (query = {}) => {
  try {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    let filter = { isActive: true };

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const totalBlogs = await Blog.countDocuments(filter);
    const blogs = await Blog.find(filter)
      .select("title image createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        blogs,
        pagination: {
          totalBlogs,
          totalPages: Math.ceil(totalBlogs / limit),
          currentPage: parseInt(page),
          limit: parseInt(limit),
        },
      },
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.getBlogDetails = async (blogId) => {
  try {
    const blog = await Blog.findOne({ _id: blogId, isActive: true }).lean();

    if (!blog) {
      throw new Error(resMessage.Data_Not_Found);
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: blog,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
