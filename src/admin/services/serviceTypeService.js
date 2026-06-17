const ServiceMaster = require("../../models/serviceTypeModel");
const Platform = require("../../models/platformModel");
const { statusCode } = require("../../config/default.json");


exports.createServiceType = async (data) => {
  try {
    // Find platform by key if platform is a string (key)
    if (typeof data.platform === "string" && !data.platform.match(/^[0-9a-fA-F]{24}$/)) {
      const platform = await Platform.findOne({ key: data.platform.toLowerCase() });
      if (!platform) {
        return {
          statusCode: statusCode.BAD_REQUEST,
          success: false,
          message: `Platform with key '${data.platform}' not found`,
        };
      }
      data.platform = platform._id;
    }

    const existingType = await ServiceMaster.findOne({
      title: data.title,
      platform: data.platform,
      type: data.type,
    });

    if (existingType) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Service type with this title, platform and type already exists",
      };
    }

    const serviceType = await ServiceMaster.create(data);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service type created successfully",
      data: serviceType,
    };
  } catch (error) {
    console.error("❌ Error in createServiceType:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getServiceTypes = async (query) => {
  try {
    const { search, platform, type, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }
    if (platform) {
      // If platform is a string but not an ObjectId, find its ID
      if (typeof platform === "string" && !platform.match(/^[0-9a-fA-F]{24}$/)) {
        const platformDoc = await Platform.findOne({ key: platform.toLowerCase() });
        filter.platform = platformDoc ? platformDoc._id : null;
      } else {
        filter.platform = platform;
      }
    }
    if (type) {
      filter.type = type;
    }

    const serviceTypes = await ServiceMaster.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "platforms",
          localField: "platform",
          foreignField: "_id",
          as: "platform",
        },
      },
      { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          type: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          "platform.name": 1,
          "platform.key": 1,
          "platform.icon": 1,
          "platform._id": 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await ServiceMaster.countDocuments(filter);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service types fetched successfully",
      data: serviceTypes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("❌ Error in getServiceTypes:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateServiceType = async (data, id) => {
  try {
    const serviceType = await ServiceMaster.findById(id);
    if (!serviceType) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Service type not found",
      };
    }

    // Find platform by key if platform is a string (key) and it's not a valid ObjectId
    if (data.platform && typeof data.platform === "string" && !data.platform.match(/^[0-9a-fA-F]{24}$/)) {
      const platform = await Platform.findOne({ key: data.platform.toLowerCase() });
      if (!platform) {
        return {
          statusCode: statusCode.BAD_REQUEST,
          success: false,
          message: `Platform with key '${data.platform}' not found`,
        };
      }
      data.platform = platform._id;
    }

    // Check unique constraints if title/platform/type changed
    if (data.title || data.platform || data.type) {
      const existingType = await ServiceMaster.findOne({
        _id: { $ne: id },
        title: data.title || serviceType.title,
        platform: data.platform || serviceType.platform,
        type: data.type || serviceType.type,
      });

      if (existingType) {
        return {
          statusCode: statusCode.BAD_REQUEST,
          success: false,
          message: "Service type with this title, platform and type already exists",
        };
      }
    }

    const updatedServiceType = await ServiceMaster.findByIdAndUpdate(id, data, {
      new: true,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service type updated successfully",
      data: updatedServiceType,
    };
  } catch (error) {
    console.error("❌ Error in updateServiceType:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteServiceType = async (id) => {
  try {
    const serviceType = await ServiceMaster.findById(id);
    if (!serviceType) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Service type not found",
      };
    }

    await ServiceMaster.findByIdAndDelete(id);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service type deleted successfully",
      data: [],
    };
  } catch (error) {
    console.error("❌ Error in deleteServiceType:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
