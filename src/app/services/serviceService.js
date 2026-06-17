const mongoose = require("mongoose");
const Service = require("../../models/serviceModel");
const ServiceMaster = require("../../models/serviceTypeModel");
const Platform = require("../../models/platformModel");
const SocialAccount = require("../../models/socialAccountModel");
const CreatorProfile = require("../../models/creatorProfileModel");
const { statusCode } = require("../../config/default.json");


exports.createService = async (body, creatorId) => {
  try {
    const {
      platform: platformKey,
      serviceType: serviceTypeName,
      description,
      deliveryTime,
      price,
      quantity,
      revisions,
    } = body;

    // 0. Check Creator Profile Approval Status
    const creatorProfile = await CreatorProfile.findOne({ userId: creatorId });
    if (!creatorProfile || creatorProfile.approvalStatus !== 1) {
      const statusMap = { 0: "Pending", 1: "Approved", 2: "Rejected" };
      const currentStatus = creatorProfile ? statusMap[creatorProfile.approvalStatus] : "Not Started";
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: `Your profile must be Approved before you can create services. Current status: ${currentStatus}`,
      };
    }

    // 1. Resolve platform key to ID
    let platformId;
    if (typeof platformKey === "string" && !platformKey.match(/^[0-9a-fA-F]{24}$/)) {
      const platform = await Platform.findOne({ key: platformKey.toLowerCase() });
      if (!platform) {
        return {
          statusCode: statusCode.BAD_REQUEST,
          success: false,
          message: `Platform '${platformKey}' not found`,
        };
      }
      platformId = platform._id;
    } else {
      platformId = platformKey;
    }

    // ✅ Validation: Creator can only create services for platforms whose details he has filled
    const linkedAccount = await SocialAccount.findOne({
      creatorId,
      platform: platformId,
    });
    if (!linkedAccount) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "You must link your social account for this platform before creating a service.",
      };
    }

    // 2. Resolve serviceType title to ID (using resolved platformId)
    let serviceTypeId;
    if (typeof serviceTypeName === "string" && !serviceTypeName.match(/^[0-9a-fA-F]{24}$/)) {
      const sType = await ServiceMaster.findOne({
        title: serviceTypeName,
        platform: platformId,
      });
      if (!sType) {
        return {
          statusCode: statusCode.BAD_REQUEST,
          success: false,
          message: `Service type '${serviceTypeName}' not found for this platform`,
        };
      }
      serviceTypeId = sType._id;
    } else {
      serviceTypeId = serviceTypeName;
    }

    // 3. Create service
    const service = await Service.create({
      creatorId,
      platform: platformId,
      serviceType: serviceTypeId,
      description,
      deliveryTime,
      price,
      quantity,
      revisions: revisions || 1,
      approvalStatus: 0, // Pending
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service created successfully and sent for approval",
      data: service,
    };
  } catch (error) {
    console.error("❌ Error in createService:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getServices = async (query, creatorId) => {
  try {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    let filter = { creatorId, isActive: true };
    if (status !== undefined) {
      filter.approvalStatus = parseInt(status);
    }

    const services = await Service.aggregate([
      { 
        $match: {
          ...filter,
          creatorId: new mongoose.Types.ObjectId(creatorId)
        } 
      },
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
        $lookup: {
          from: "servicemasters",
          localField: "serviceType",
          foreignField: "_id",
          as: "serviceType",
        },
      },
      { $unwind: { path: "$serviceType", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          description: 1,
          deliveryTime: 1,
          price: 1,
          quantity: 1,
          revisions: 1,
          approvalStatus: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          "platform.name": 1,
          "platform.key": 1,
          "platform.icon": 1,
          "platform._id": 1,
          "serviceType.title": 1,
          "serviceType.type": 1,
          "serviceType._id": 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await Service.countDocuments(filter);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Services fetched successfully",
      data: services,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("❌ Error in getServices:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};


exports.updateService = async (id, updateData, creatorId) => {
  try {
    const service = await Service.findOne({ _id: id, creatorId });
    if (!service) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Service not found or access denied",
      };
    }

    // Prevent updating restricted fields
    delete updateData.creatorId;
    delete updateData.approvalStatus;

    // Resolve platform/serviceType if they are being updated
    if (updateData.platform) {
      if (typeof updateData.platform === "string" && !updateData.platform.match(/^[0-9a-fA-F]{24}$/)) {
        const platform = await Platform.findOne({ key: updateData.platform.toLowerCase() });
        if (!platform) {
          return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: `Platform '${updateData.platform}' not found`,
          };
        }
        updateData.platform = platform._id;
      }
    }

    if (updateData.serviceType) {
      const platformId = updateData.platform || service.platform;
      if (typeof updateData.serviceType === "string" && !updateData.serviceType.match(/^[0-9a-fA-F]{24}$/)) {
        const sType = await ServiceMaster.findOne({
          title: updateData.serviceType,
          platform: platformId,
        });
        if (!sType) {
          return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: `Service type '${updateData.serviceType}' not found for this platform`,
          };
        }
        updateData.serviceType = sType._id;
      }
    }

    const updatedService = await Service.findByIdAndUpdate(id, updateData, { new: true });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    };
  } catch (error) {
    console.error("❌ Error in updateService:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteService = async (id, creatorId) => {
  try {
    const service = await Service.findOne({ _id: id, creatorId });
    if (!service) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Service not found or access denied",
      };
    }

    await Service.findByIdAndUpdate(id, { isActive: false });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service deleted successfully",
    };
  } catch (error) {
    console.error("❌ Error in deleteService:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getAllServices = async (query) => {
  try {
    const { platform, serviceType, page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    let filter = { isActive: true, approvalStatus: 1 }; // Only approved and active

    if (platform) {
      // Resolve platform key or ID
      if (platform.match(/^[0-9a-fA-F]{24}$/)) {
        filter.platform = platform;
      } else {
        const p = await Platform.findOne({ key: platform.toLowerCase() });
        if (p) filter.platform = p._id;
      }
    }

    if (serviceType) {
      // Resolve serviceType title or ID
      if (serviceType.match(/^[0-9a-fA-F]{24}$/)) {
        filter.serviceType = serviceType;
      } else {
        const s = await ServiceMaster.findOne({ title: serviceType, platform: filter.platform });
        if (s) filter.serviceType = s._id;
      }
    }

    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const services = await Service.aggregate([
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
        $lookup: {
          from: "servicemasters",
          localField: "serviceType",
          foreignField: "_id",
          as: "serviceType",
        },
      },
      { $unwind: { path: "$serviceType", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const formattedServices = services.map(s => ({
      _id: s._id,
      platformKey: s.platform ? s.platform.key : null,
      serviceType: s.serviceType ? s.serviceType.title : null
    }));

    const total = await Service.countDocuments(filter);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Services fetched successfully",
      data: formattedServices,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("❌ Error in getAllServices:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getServiceTypesByPlatform = async (platformId) => {
  try {
    const serviceTypes = await ServiceMaster.find({
      platform: platformId,
      isActive: true,
    }).sort({ title: 1 });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Service types fetched successfully",
      data: serviceTypes,
    };
  } catch (error) {
    console.error("❌ Error in getServiceTypesByPlatform:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
