const mongoose = require("mongoose");
const userModel = require("../../models/userModel");
const creatorProfileModel = require("../../models/creatorProfileModel");
const serviceModel = require("../../models/serviceModel");
const Category = require("../../models/categoryModel");
const socialAccountModel = require("../../models/socialAccountModel");
const portfolioModel = require("../../models/portfolioModel");

const { statusCode } = require("../../config/default.json");
const { resMessage } = require("../../config/default.json");


exports.getAllCreators = async (query) => {
    try {
        const {
            search = "",
            page = 1,
            limit = 10,
            isBlocked,
            activityFrom,
            activityTo,
            status,
            isFeatured,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;

        const filter = { role: "creator" };

        // Search across userName, email, and mobile (single search box)
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search.trim(), "i");
            const orConditions = [
                { userName: searchRegex },
                { email: searchRegex },
            ];

            // Mobile is stored as Number, so convert to string for partial matching
            if (!isNaN(search.trim())) {
                orConditions.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$mobile" },
                            regex: search.trim(),
                            options: "i",
                        },
                    },
                });
            }

            filter.$or = orConditions;
        }

        // ---- Account Status Filters ----
        if (isBlocked !== undefined) {
            filter.isBlocked = isBlocked === "true";
        }

        // ---- Activity Filters ----

        if (activityFrom || activityTo) {
            filter.loginDate = {};
            if (activityFrom) {
                filter.loginDate.$gte = new Date(activityFrom);
            }
            if (activityTo) {
                filter.loginDate.$lte = new Date(activityTo);
            }
        }

        // --- Creator Stats & Status Filter ---
        const [totalCreators, totalBlocked, totalApproved, totalPending, totalRejected] = await Promise.all([
            userModel.countDocuments({ role: "creator" }),
            userModel.countDocuments({ role: "creator", isBlocked: true }),
            creatorProfileModel.countDocuments({ approvalStatus: 1 }),
            creatorProfileModel.countDocuments({ approvalStatus: 0 }),
            creatorProfileModel.countDocuments({ approvalStatus: 2 })
        ]);

        const stats = { totalCreators, totalApproved, totalPending, totalRejected, totalBlocked };

        if (status && status !== "all") {
            if (status === "blocked") {
                filter.isBlocked = true;
            } else {
                let targetStatus = undefined;
                if (status === "pending") targetStatus = 0;
                else if (status === "approved") targetStatus = 1;
                else if (status === "rejected") targetStatus = 2;

                if (targetStatus !== undefined) {
                    const matchedProfiles = await creatorProfileModel.find({ approvalStatus: targetStatus }).select("userId").lean();
                    const uIds = matchedProfiles.map(p => p.userId);
                    if (filter._id && filter._id.$in) {
                        const prevIn = filter._id.$in.map(id => id.toString());
                        filter._id.$in = uIds.filter(id => prevIn.includes(id.toString()));
                    } else {
                        filter._id = { $in: uIds };
                    }
                }
            }
        }
        
        // ---- Featured Status Filter ----
        if (isFeatured !== undefined) {
             const featuredValue = isFeatured === "true";
             const matchedProfiles = await creatorProfileModel.find({ isFeatured: featuredValue }).select("userId").lean();
             const uIds = matchedProfiles.map(p => p.userId);
             if (filter._id && filter._id.$in) {
                 const prevIn = filter._id.$in.map(id => id.toString());
                 filter._id.$in = uIds.filter(id => prevIn.includes(id.toString()));
             } else {
                 filter._id = { $in: uIds };
             }
        }

        // Exclude sensitive fields
        const excludeFields = "-password -otp -token -__v";

        let sortField = "createdAt"; // default

        // Map 'name' to the actual DB schema field 'userName', otherwise use 'email' or the default.
        if (sortBy === "name" || sortBy === "userName") {
            sortField = "userName";
        } else if (sortBy === "email") {
            sortField = "email";
        } else if (sortBy) {
            sortField = sortBy;
        }

        const sortObj = {};
        sortObj[sortField] = sortOrder === "asc" ? 1 : -1;

        const skipCount = (Number(page) - 1) * Number(limit);

        const [
            users,
            totalCount,
        ] = await Promise.all([
            userModel
                .find(filter)
                .select(excludeFields)
                .sort(sortObj)
                .skip(skipCount)
                .limit(Number(limit))
                .lean(),
            userModel.countDocuments(filter),
        ]);

        // Attach profile data so admin can see approval status without fetching details
        if (users.length > 0) {
            const userIds = users.map(u => u._id);
            const profiles = await creatorProfileModel.find({ userId: { $in: userIds } }).select("userId approvalStatus category isFeatured").lean();

            // Resolve Category IDs to Names
            const mongoose = require("mongoose");
            const allCategoryIds = [...new Set(profiles.flatMap(p => p.category || []))];

            // Filter only valid ObjectIds to avoid "Cast to ObjectId failed" errors
            const validObjectIds = allCategoryIds.filter(id => mongoose.Types.ObjectId.isValid(id));

            const categories = await Category.find({ _id: { $in: validObjectIds } }).select("name").lean();
            const categoryMap = {};
            categories.forEach(cat => categoryMap[cat._id.toString()] = cat.name);

            const profileMap = {};
            profiles.forEach(p => {
                if (p.category && Array.isArray(p.category)) {
                    p.category = p.category.map(catId => categoryMap[catId.toString()] || catId);
                }
                profileMap[p.userId.toString()] = p;
            });

            users.forEach(u => {
                u.creatorProfile = profileMap[u._id.toString()] || null;
            });
        }

        return {
            statusCode: statusCode.OK,
            success: true,
            message: resMessage.Users_Retrieved_Successfully,
            data: {
                users,
                stats,
                totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount / Number(limit)),
            },
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.blockUnblockUser = async (userId, body) => {
    try {
        if (body.isBlocked === undefined || body.isBlocked === null) {
            return {
                statusCode: statusCode.BAD_REQUEST,
                success: false,
                message: "isBlocked field is required",
            };
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return {
                statusCode: statusCode.DATA_NOT_FOUND,
                success: false,
                message: resMessage.User_Not_Found,
            };
        }

        const isBlocked = String(body.isBlocked) === "true";

        const updatedUser = await userModel
            .findByIdAndUpdate(
                userId,
                { isBlocked: isBlocked },
                { new: true },
            )
            .select("-password -otp -token -__v")
            .lean();

        const message = isBlocked
            ? resMessage.User_Blocked_Successfully
            : resMessage.User_Unblocked_Successfully;

        return {
            statusCode: statusCode.OK,
            success: true,
            message
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};

exports.approveRejectCreator = async (userId, payload) => {
    try {
        const { status, approvalComment } = payload;

        if (![1, 2].includes(Number(status))) {
            return {
                statusCode: statusCode.BAD_REQUEST,
                success: false,
                message: "Invalid status.",
            };
        }

        const creatorProfile = await creatorProfileModel.findOne({ userId });
        if (!creatorProfile) {
            return {
                statusCode: statusCode.DATA_NOT_FOUND,
                success: false,
                message: "Creator profile not found",
            };
        }

        creatorProfile.approvalStatus = Number(status);
        creatorProfile.rejectReason = approvalComment || "";
        creatorProfile.approvedAt = Number(status) === 1 ? new Date() : null;

        await creatorProfile.save();

        return {
            statusCode: statusCode.OK,
            success: true,
            message: `Creator profile ${status === 1 ? "approved" : "rejected"} successfully`
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};


exports.getCreatorDetails = async (userId) => {
    try {
        const user = await userModel.findById(userId).select("-password -otp -token -__v").lean();
        if (!user) {
            return {
                statusCode: statusCode.DATA_NOT_FOUND,
                success: false,
                message: resMessage.User_Not_Found,
            };
        }

        const [profile, socials, portfolio, services] = await Promise.all([
            creatorProfileModel.findOne({ userId }).lean(),
            socialAccountModel.aggregate([
                { $match: { creatorId: new mongoose.Types.ObjectId(userId) } },
                {
                    $lookup: {
                        from: "platforms", // Assuming collection name is 'platforms'
                        localField: "platform",
                        foreignField: "_id",
                        as: "platform"
                    }
                },
                { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "platform.name": 1,
                        "platform.icon": 1,
                        "platform._id": 1,
                        handle: 1,
                        followers: 1,
                        creatorId: 1,
                        isActive: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]),
            portfolioModel.find({ creatorId: userId }).lean(),
            serviceModel.aggregate([
                { $match: { creatorId: new mongoose.Types.ObjectId(userId) } },
                {
                    $lookup: {
                        from: "platforms",
                        localField: "platform",
                        foreignField: "_id",
                        as: "platform"
                    }
                },
                { $unwind: { path: "$platform", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "servicemasters", // Assuming collection name is 'servicemasters'
                        localField: "serviceType",
                        foreignField: "_id",
                        as: "serviceType"
                    }
                },
                { $unwind: { path: "$serviceType", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        "platform.name": 1,
                        "platform.icon": 1,
                        "platform._id": 1,
                        "serviceType.title": 1,
                        "serviceType._id": 1,
                        description: 1,
                        deliveryTime: 1,
                        price: 1,
                        quantity: 1,
                        revisions: 1,
                        approvalStatus: 1,
                        creatorId: 1,
                        isActive: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ])
        ]);

        if (profile) {
            // Resolve Category IDs to Names (handling cases where they might be strings or invalid ObjectIds)
            if (profile.category && profile.category.length > 0) {
                const validCategoryIds = profile.category.filter(id => mongoose.Types.ObjectId.isValid(id));
                const nonObjectIdCategories = profile.category.filter(id => !mongoose.Types.ObjectId.isValid(id));

                if (validCategoryIds.length > 0) {
                    const categories = await Category.find({ _id: { $in: validCategoryIds } }).select("name").lean();
                    const categoryNames = categories.map(c => c.name);
                    profile.category = [...new Set([...categoryNames, ...nonObjectIdCategories])];
                } else {
                    profile.category = nonObjectIdCategories;
                }
            }
        }

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Creator details retrieved successfully",
            data: {
                user,
                profile: profile || null,
                socials: socials || [],
                portfolio: portfolio || [],
                services: services || []
            },
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
exports.toggleFeaturedCreator = async (userId, payload) => {
    try {
        const { isFeatured } = payload;

        if (isFeatured === undefined || isFeatured === null) {
            return {
                statusCode: statusCode.BAD_REQUEST,
                success: false,
                message: "isFeatured field is required",
            };
        }

        const creatorProfile = await creatorProfileModel.findOne({ userId });

        if (!creatorProfile) {
            return {
                statusCode: statusCode.DATA_NOT_FOUND,
                success: false,
                message: "Creator profile not found",
            };
        }

        creatorProfile.isFeatured = String(isFeatured) === "true";
        await creatorProfile.save();

        return {
            statusCode: statusCode.OK,
            success: true,
            message: `Creator ${creatorProfile.isFeatured ? "featured" : "unfeatured"} successfully`
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message,
        };
    }
};
