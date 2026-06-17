const Blog = require("../../models/blogModel");
const { statusCode, resMessage } = require("../../config/default.json");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../helpers/uploadToCloudinary");


exports.createBlog = async (body, file) => {
  try {
    const { title, content, isActive } = body;

    let imageData = {};
    if (file) {
      const uploadResult = await uploadToCloudinary(file);
      imageData = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        resource_type: uploadResult.resource_type,
      };
    }

    const blog = await Blog.create({
      title,
      content,
      image: imageData,
      isActive: isActive !== undefined ? isActive : true,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Created_Successfully,
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

exports.getAllBlogs = async (query = {}) => {
  try {
    const { page = 1, limit = 10, isActive, search } = query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const [blogs, totalBlogs, totalActive, totalInactive] = await Promise.all([
      Blog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Blog.countDocuments(),
      Blog.countDocuments({ isActive: true }),
      Blog.countDocuments({ isActive: false })
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        blogs,
        statistics: {
          totalBlogs,
          totalActive,
          totalInactive
        },
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

exports.getBlogById = async (blogId) => {
  try {
    const blog = await Blog.findById(blogId).lean();

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

exports.updateBlog = async (blogId, body, file) => {
  try {
    let updateData = { ...body };

    if (file) {
      const oldBlog = await Blog.findById(blogId);
      if (oldBlog && oldBlog.image && oldBlog.image.public_id) {
        await deleteFromCloudinary(oldBlog.image.public_id);
      }

      const uploadResult = await uploadToCloudinary(file);
      updateData.image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        resource_type: uploadResult.resource_type,
      };
    }

    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!blog) {
      throw new Error(resMessage.Data_Not_Found);
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Updated_Successfully,
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

exports.deleteBlog = async (blogId) => {
  try {
    const blog = await Blog.findByIdAndDelete(blogId);

    if (!blog) {
      throw new Error(resMessage.Data_Not_Found);
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Deleted_Successfully,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
