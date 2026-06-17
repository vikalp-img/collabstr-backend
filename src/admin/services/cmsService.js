const CMS = require("../../models/cmsModel");
const { statusCode } = require("../../config/default.json");


exports.getCmsContent = async (type) => {
  const query = type ? { type } : {};
  const cmsData = await CMS.find(query).lean();

  if (!cmsData || cmsData.length === 0) {
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "No CMS content found",
      data: type ? null : [],
    };
  }

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "CMS content fetched successfully",
    data: type ? cmsData[0] : cmsData,
  };
};

exports.addCmsContent = async (adminId, body) => {
  const { type, content } = body;

  if (!type || !content) {
    throw new Error("Type and content are required");
  }

  const existingCms = await CMS.findOne({ type });
  if (existingCms) {
    throw new Error(`CMS content for type '${type}' already exists`);
  }

  const cmsData = await CMS.create({ type, content });

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "CMS content added successfully",
    data: cmsData,
  };
};

exports.updateCmsContent = async (id, body) => {
  const { type, content } = body;
  const updateData = {};
  if (type) updateData.type = type;
  if (content) updateData.content = content;

  const cmsData = await CMS.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!cmsData) {
    throw new Error("CMS content not found");
  }

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "CMS content updated successfully",
    data: cmsData,
  };
};

exports.deleteCmsContent = async (id) => {
  const cmsData = await CMS.findByIdAndDelete(id);

  if (!cmsData) {
    throw new Error("CMS content not found");
  }

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "CMS content deleted successfully",
  };
};
