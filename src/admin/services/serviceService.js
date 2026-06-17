const mongoose = require("mongoose");
const Service = require("../../models/serviceModel");
const ServiceMaster = require("../../models/serviceTypeModel");
const Platform = require("../../models/platformModel");
const { statusCode } = require("../../config/default.json");


exports.getServices = async (query) => {
  try {
    const {
      status, // support string status: pending, approved, rejected
      platform,
      serviceType,
      creatorId,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { isActive: true };

    // --- Statistics (Independent of filters except role/basic setup) ---
    const [totalCount, totalPending, totalApproved, totalRejected] = await Promise.all([
      Service.countDocuments({ isActive: true }),
      Service.countDocuments({ isActive: true, approvalStatus: 0 }),
      Service.countDocuments({ isActive: true, approvalStatus: 1 }),
      Service.countDocuments({ isActive: true, approvalStatus: 2 })
    ]);

    const stats = { totalCount, totalPending, totalApproved, totalRejected };

    // --- Apply Filters ---
    if (status && status !== "all") {
      if (status === "pending") filter.approvalStatus = 0;
      else if (status === "approved") filter.approvalStatus = 1;
      else if (status === "rejected") filter.approvalStatus = 2;
    }

    if (platform) {
      if (mongoose.Types.ObjectId.isValid(platform)) {
        filter.platform = new mongoose.Types.ObjectId(platform);
      } else {
        const p = await Platform.findOne({ key: platform.toLowerCase() });
        if (p) filter.platform = p._id;
      }
    }

    if (serviceType) {
      if (mongoose.Types.ObjectId.isValid(serviceType)) {
        filter.serviceType = new mongoose.Types.ObjectId(serviceType);
      } else {
        const s = await ServiceMaster.findOne({ title: serviceType });
        if (s) filter.serviceType = s._id;
      }
    }

    if (creatorId) {
      if (mongoose.Types.ObjectId.isValid(creatorId)) {
        filter.creatorId = new mongoose.Types.ObjectId(creatorId);
      }
    }

    const aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "_id",
          as: "creator",
        },
      },
      { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
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
    ];

    if (search) {
      aggregate.push({
        $match: {
          $or: [
            { description: { $regex: search, $options: "i" } },
            { "creator.userName": { $regex: search, $options: "i" } },
            { "creator.email": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const totalResults = await Service.aggregate([...aggregate, { $count: "count" }]);
    const total = totalResults.length > 0 ? totalResults[0].count : 0;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const services = await Service.aggregate([
      ...aggregate,
      { $sort: sortObj },
      { $skip: skip },
      { $limit: parseInt(limit) },
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
          "creator.userName": 1,
          "creator.email": 1,
          "creator._id": 1,
          "creator.profile_image": 1,
          "platform.name": 1,
          "platform.key": 1,
          "platform._id": 1,
          "serviceType.title": 1,
          "serviceType._id": 1,
        },
      },
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Services fetched successfully",
      data: {
        services,
        stats,
        totalCount: total, // current results count after search/filter
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  } catch (error) {
    console.error("❌ Error in admin getServices:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateApprovalStatus = async (id, approvalStatus) => {
  try {
    if (![0, 1, 2].includes(parseInt(approvalStatus))) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid approval status.",
      };
    }

    const service = await Service.findByIdAndUpdate(
      id,
      { approvalStatus: parseInt(approvalStatus) },
      { new: true }
    );

    if (!service) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Service not found",
      };
    }

    const statusMap = { 0: "Pending", 1: "Approved", 2: "Rejected" };

    return {
      statusCode: statusCode.OK,
      success: true,
      message: `Service status updated to ${statusMap[approvalStatus]}`,
      data: service,
    };
  } catch (error) {
    console.error("❌ Error in admin updateApprovalStatus:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
