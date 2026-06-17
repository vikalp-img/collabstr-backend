const userModel = require("../../models/userModel");
const { statusCode, resMessage } = require("../../config/default.json");


exports.getKycList = async (query) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      isDeleted,
      loginStatus,
      activityFrom,
      activityTo,
      kycStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
      role = "creator"
    } = query;

    // 1. Base Filter (everything EXCEPT kycStatus)
    const baseFilter = { isDeleted: false, role };

    // Search logic (UserName, Email, Mobile)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      const orConditions = [
        { userName: searchRegex },
        { email: searchRegex },
      ];

      // Mobile partial matching
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
      baseFilter.$or = orConditions;
    }

    // ---- Filters ----
    if (isDeleted !== undefined) {
      baseFilter.isDeleted = isDeleted === "true";
    }
    if (loginStatus !== undefined) {
      baseFilter.loginStatus = loginStatus === "true";
    }

    if (activityFrom || activityTo) {
      baseFilter.loginDate = {};
      if (activityFrom) {
        baseFilter.loginDate.$gte = new Date(activityFrom);
      }
      if (activityTo) {
        baseFilter.loginDate.$lte = new Date(activityTo);
      }
    }

    // 2. KYC Status Filter for the List
    let kycMatch = {};
    const rejectedCondition = {
      $or: [
        { "user_verify.pan_verify": 2 },
        { "user_verify.aadhar_verify": 2 },
        { "user_verify.bank_verify": 2 },
        { "user_verify.email_verify": 2 }
      ]
    };
    const pendingCondition = {
      $and: [
        { "user_verify.pan_verify": { $ne: 2 } },
        { "user_verify.aadhar_verify": { $ne: 2 } },
        { "user_verify.bank_verify": { $ne: 2 } },
        { "user_verify.email_verify": { $ne: 2 } },
        {
          $or: [
            { "user_verify.pan_verify": 0 },
            { "user_verify.aadhar_verify": 0 },
            { "user_verify.bank_verify": 0 },
            { "user_verify.email_verify": 0 }
          ]
        }
      ]
    };
    const notStartedCondition = {
      "user_verify.pan_verify": { $in: [-1, null] },
      "user_verify.aadhar_verify": { $in: [-1, null] },
      "user_verify.bank_verify": { $in: [-1, null] }
    };

    if (kycStatus && kycStatus !== "All Users") {
      const statusLower = kycStatus.toLowerCase();
      if (statusLower === "approved") {
        kycMatch.isStatus = true;
      } else if (statusLower === "rejected") {
        Object.assign(kycMatch, rejectedCondition);
      } else if (statusLower === "pending") {
        Object.assign(kycMatch, pendingCondition);
      } else if (statusLower === "not started" || statusLower === "notstarted") {
        Object.assign(kycMatch, notStartedCondition);
      }
    }

    // Sorting
    let sortField = "createdAt";
    if (sortBy === "name" || sortBy === "userName") {
      sortField = "userName";
    } else if (sortBy === "email") {
      sortField = "email";
    } else if (sortBy) {
      sortField = sortBy;
    }
    const sortObj = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    const skipCount = (Number(page) - 1) * Number(limit);
    const limitCount = Number(limit);

    // 3. Multi-facet aggregation
    const results = await userModel.aggregate([
      { $match: baseFilter }, // Filter by search/role etc. first
      {
        $facet: {
          list: [
            { $match: kycMatch }, // Apply status filter ONLY to the list
            { $sort: sortObj },
            { $skip: skipCount },
            { $limit: limitCount },
            {
              $project: {
                password: 0,
                otp: 0,
                token: 0,
                __v: 0
              }
            }
          ],
          totalCount: [
            { $match: kycMatch },
            { $count: "count" }
          ],
          allUsersCount: [{ $count: "count" }], // Total users matching search/role
          approvedCount: [
            { $match: { isStatus: true } },
            { $count: "count" }
          ],
          rejectedCount: [
            { $match: rejectedCondition },
            { $count: "count" }
          ],
          pendingCount: [
            { $match: pendingCondition },
            { $count: "count" }
          ],
          notStartedCount: [
            { $match: notStartedCondition },
            { $count: "count" }
          ]
        }
      }
    ]);

    const facet = results[0];
    const totalCount = facet.totalCount[0]?.count || 0;

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: {
        users: facet.list, // List of users (filtered by search AND status)
        totalCount, // Count of users in the filtered list
        page: Number(page),
        limit: limitCount,
        totalPages: Math.ceil(totalCount / limitCount),
        kycCounts: {
          allUsers: facet.allUsersCount[0]?.count || 0, // Total users matching search
          approved: facet.approvedCount[0]?.count || 0,
          rejected: facet.rejectedCount[0]?.count || 0,
          pending: facet.pendingCount[0]?.count || 0,
          notStarted: facet.notStartedCount[0]?.count || 0
        }
      },
    };
  } catch (error) {
    console.error("Error in getKycList service:", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};



exports.getKycById = async (id) => {
  try {
    const user = await userModel.findById(id).select("aadharcard pancard bank");
    if (!user) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: resMessage.User_Not_Found
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Data_Fetch_Successfully,
      data: user
    };
  } catch (error) {
    console.error("Error in getKycById service:", error);
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message
    };
  }
};

exports.updateKycStatus = async (userId, body) => {
  try {
    const { documentType, status, comment } = body;

    // Validate inputs
    const validDocs = ["pancard", "aadharcard", "bank", "email"];
    if (!validDocs.includes(documentType)) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        status: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid document type",
      };
    }

    if (![0, 1, 2].includes(status)) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        status: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid status. Must be 0 (Pending), 1 (Approved), or 2 (Rejected)",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        status: statusCode.DATA_NOT_FOUND,
        success: false,
        message: resMessage.User_Not_Found,
      };
    }

    // Update specific document status
    if (documentType === "email") {
      user.user_verify.email_verify = status;
      // Also update isPhoneVerify if you were treating email/phone verify similarly, 
      // but based on prompt, we just sync user_verify.email_verify.
    } else {
      // For pancard, aadharcard, bank
      if (!user[documentType]) {
        user[documentType] = {}; // Ensure object exists
      }
      user[documentType].status = status;
      if (comment) {
        user[documentType].comment = comment;
      }

      // Sync with user_verify
      // Map documentType to verification field
      const verifyMap = {
        pancard: "pan_verify",
        aadharcard: "aadhar_verify",
        bank: "bank_verify"
      };

      if (verifyMap[documentType]) {
        user.user_verify[verifyMap[documentType]] = status;
      }
    }

    // Recalculate global isStatus
    // isStatus is true ONLY if ALL 4 are approved (status === 1)
    const isPanApproved = user.user_verify.pan_verify === 1;
    const isAadharApproved = user.user_verify.aadhar_verify === 1;
    const isBankApproved = user.user_verify.bank_verify === 1;
    const isEmailApproved = user.user_verify.email_verify === 1;

    user.isStatus = isPanApproved && isAadharApproved && isBankApproved && isEmailApproved;

    await user.save();

    return {
      statusCode: statusCode.OK,
      status: statusCode.OK,
      success: true,
      message: "KYC Status Updated Successfully",
      data: {
        _id: user._id,
        user_verify: user.user_verify,
        isStatus: user.isStatus,
        [documentType]: documentType === 'email' ? undefined : user[documentType]
      },
    };

  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      status: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};