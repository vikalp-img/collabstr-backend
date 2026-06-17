const Platform = require("../../models/platformModel");
const { statusCode } = require("../../config/default.json");


exports.createPlatform = async (data) => {
  const existingPlatform = await Platform.findOne({
    $or: [{ name: data.name }, { key: data.key }],
  });

  if (existingPlatform) {
    throw new Error("Platform with this name or key already exists");
  }

  const platform = await Platform.create(data);

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "Platform created successfully",
    data: platform,
  };
};

exports.getPlatforms = async (query) => {
  const { search, page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  let filter = {};
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const platforms = await Platform.find(filter)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Platform.countDocuments(filter);

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "Platforms fetched successfully",
    data: platforms,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
};

exports.updatePlatform = async (data, id) => {
  const platform = await Platform.findById(id);
  if (!platform) {
    throw new Error("Platform not found");
  }

  // Check if updating name/key to something that already exists
  if (data.name || data.key) {
    const existingPlatform = await Platform.findOne({
      _id: { $ne: id },
      $or: [
        ...(data.name ? [{ name: data.name }] : []),
        ...(data.key ? [{ key: data.key }] : []),
      ],
    });

    if (existingPlatform) {
      throw new Error("Platform with this name or key already exists");
    }
  }

  const updatedPlatform = await Platform.findByIdAndUpdate(id, data, {
    new: true,
  });

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "Platform updated successfully",
    data: updatedPlatform,
  };
};

exports.deletePlatform = async (id) => {
  const platform = await Platform.findById(id);
  if (!platform) {
    throw new Error("Platform not found");
  }

  await Platform.findByIdAndDelete(id);

  return {
    statusCode: statusCode.OK,
    success: true,
    message: "Platform deleted successfully",
    data: [],
  };
};
