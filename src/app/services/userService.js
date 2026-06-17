const userModel = require("../../models/userModel");
const Plan = require("../../models/planModel");
const creatorProfileModel = require("../../models/creatorProfileModel");
const brandProfileModel = require("../../models/brandProfileModel");
const platformModel = require("../../models/platformModel");
const socialAccountModel = require("../../models/socialAccountModel");
const serviceModel = require("../../models/serviceModel");
const serviceTypeModel = require("../../models/serviceTypeModel");
const portfolioModel = require("../../models/portfolioModel");
const walletModel = require("../../models/walletModel");
const favoriteModel = require("../../models/favoriteModel");
const Category = require("../../models/categoryModel");
const subscriptionModel = require("../../models/subscriptionModel");
const subscriptionService = require("./subscriptionService");

const { statusCode, resMessage } = require("../../config/default.json");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../helpers/uploadToCloudinary");
const { generateToken } = require("../../helpers/jwt");
const { generateOtp, sendOtp, sentOtp } = require("../../helpers/otpHelper");


exports.login = async (body) => {
  try {
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Email and password are required."
      };
    }

    // 📧 Email/Password Login Flow
    const user = await userModel.findOne({ email, isDeleted: false });
    if (!user) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid email or password."
      };
    }

    if (user.isBlocked) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: resMessage.Your_Account_is_Blocked
      };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid email or password."
      };
    }

    const token = generateToken({ _id: user._id, role: user.role });
    user.token = token;
    user.loginDate = new Date();
    user.loginStatus = true;
    await user.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Logged in successfully.",
      data: {
        userId: user._id,
        token,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};


exports.register = async (body) => {
  try {
    const { userName, email, password, role } = body;

    if (!userName || !email || !password || !role) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid Credentials"
      };
    }

    if (!["creator", "brand"].includes(role)) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid Credentials"
      };
    }

    const existingUser = await userModel.findOne({ email, isDeleted: false });
    if (existingUser) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Email is already registered."
      };
    }

    const newUser = new userModel({
      userName,
      email,
      password,
      role,
      isEmailVerify: true
    });

    const savedUser = await newUser.save();

    // Create initial profile based on role
    if (role === "creator") {
      await creatorProfileModel.create({ userId: savedUser._id });
    } else if (role === "brand") {
      await brandProfileModel.create({ userId: savedUser._id });

      const basicPlan = await Plan.findOne({ name: "Basic", status: true });
      if (basicPlan) {
        await subscriptionService.purchasePlan(savedUser._id, basicPlan._id);
      }
    }

    // Create user's wallet
    await walletModel.create({ userId: savedUser._id, balance: 0 });

    const token = generateToken({ _id: savedUser._id, role: savedUser.role });
    savedUser.token = token;
    await savedUser.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "User registered successfully.",
      data: {
        userId: savedUser._id,
        token,
        userName: savedUser.userName,
        email: savedUser.email
      }
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};


exports.registerCreator = async (body, files) => {
  try {
    const {
      userName, email, password,
      location, title, bio, gender, ethnicity, languages, category,
      social, // { platformKey, handle, followers } OR [{ platformKey, handle, followers }]
      service // { platformKey, serviceType, quantity, price, description, deliveryTime } OR [{ platformKey, serviceType, quantity, price, description, deliveryTime }]
    } = body;

    // 1. Basic Validation
    if (!userName || !email || !password) {
      return { statusCode: statusCode.BAD_REQUEST, success: false, message: "Name, email, and password are required." };
    }

    const existingUser = await userModel.findOne({ email, isDeleted: false });
    if (existingUser) {
      return { statusCode: statusCode.BAD_REQUEST, success: false, message: "Email is already registered." };
    }

    // 2. Normalize and Resolve Platforms for Social
    const socialAccountsInput = Array.isArray(social) ? social : (social ? [social] : []);
    const resolvedSocials = [];
    const allowedPlatformIds = new Set();
    for (const s of socialAccountsInput) {
      if (!s.platformKey || !s.handle) continue;
      const platform = await platformModel.findOne({ key: s.platformKey.toLowerCase() });
      if (!platform) throw new Error(`Social platform '${s.platformKey}' not found`);
      resolvedSocials.push({
        platform: platform._id,
        handle: s.handle,
        followers: s.followers || 0
      });
      allowedPlatformIds.add(platform._id.toString());
    }

    // 3. Normalize and Resolve Platforms and Service Types for Services
    const servicesInput = Array.isArray(service) ? service : (service ? [service] : []);
    const resolvedServices = [];
    for (const s of servicesInput) {
      if (!s.platformKey || !s.serviceType) continue;
      const platform = await platformModel.findOne({ key: s.platformKey.toLowerCase() });
      if (!platform) throw new Error(`Service platform '${s.platformKey}' not found`);

      // ✅ Validation: Creator can only create services for platforms whose details he has filled
      if (!allowedPlatformIds.has(platform._id.toString())) {
        throw new Error(`You can only create services for platforms you have added social details for (${s.platformKey})`);
      }

      const sType = await serviceTypeModel.findOne({
        title: s.serviceType,
        platform: platform._id
      });
      if (!sType) throw new Error(`Service type '${s.serviceType}' not found for platform '${s.platformKey}'`);

      resolvedServices.push({
        platform: platform._id,
        serviceType: sType._id,
        description: s.description || "",
        price: s.price || 0,
        quantity: s.quantity || 1,
        deliveryTime: s.deliveryTime || 1
      });
    }

    // 4. Create User
    const newUser = new userModel({
      userName,
      email,
      password,
      role: "creator",
      isEmailVerify: true
    });
    const savedUser = await newUser.save();

    // 5. Create Creator Profile
    await creatorProfileModel.create({
      userId: savedUser._id,
      title: title || "",
      bio: bio || "",
      gender: gender || "",
      ethnicity: ethnicity || "",
      languages: languages || [],
      category: category || [],
      location: {
        address: location?.address || "",
        city: location?.city || "",
        state: location?.state || "",
        country: location?.country || ""
      }
    });

    // 6. Create Social Accounts
    if (resolvedSocials.length > 0) {
      await socialAccountModel.insertMany(resolvedSocials.map(s => ({
        creatorId: savedUser._id,
        ...s
      })));
    }

    // 7. Create Service Packages
    if (resolvedServices.length > 0) {
      await serviceModel.insertMany(resolvedServices.map(s => ({
        creatorId: savedUser._id,
        ...s,
        approvalStatus: 0 // Pending
      })));
    }

    // 7.5 Process Portfolio Media
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => uploadToCloudinary(file));
      const uploadResults = await Promise.all(uploadPromises);

      const portfolioItems = uploadResults.map(result => ({
        creatorId: savedUser._id,
        media: {
          url: result.secure_url || result.url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          provider: "cloudinary"
        }
      }));
      await portfolioModel.insertMany(portfolioItems);
    }

    // 8. Create user's wallet
    await walletModel.create({ userId: savedUser._id, balance: 0 });

    // 9. Generate Token
    const token = generateToken({ _id: savedUser._id, role: savedUser.role });
    savedUser.token = token;
    await savedUser.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creator registered successfully.",
      data: {
        userId: savedUser._id,
        token,
        userName: savedUser.userName,
        email: savedUser.email
      }
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};

exports.registerBrand = async (body) => {
  try {
    const { fullname, brandname, email, password } = body;

    if (!fullname || !brandname || !email || !password) {
      return { statusCode: statusCode.BAD_REQUEST, success: false, message: "Fullname, brandname, email, and password are required." };
    }

    const existingUser = await userModel.findOne({ email, isDeleted: false });
    if (existingUser) {
      return { statusCode: statusCode.BAD_REQUEST, success: false, message: "Email is already registered." };
    }

    const newUser = new userModel({
      userName: fullname,
      email,
      password,
      role: "brand",
      isEmailVerify: true
    });
    const savedUser = await newUser.save();

    await brandProfileModel.create({
      userId: savedUser._id,
      companyName: brandname
    });

    await walletModel.create({ userId: savedUser._id, balance: 0 });

    const basicPlan = await Plan.findOne({ name: "Basic", status: true });
    if (basicPlan) {
      await subscriptionService.purchasePlan(savedUser._id, basicPlan._id);
    }

    const token = generateToken({ _id: savedUser._id, role: savedUser.role });
    savedUser.token = token;
    await savedUser.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Brand registered successfully.",
      data: {
        userId: savedUser._id,
        token,
        userName: savedUser.userName,
        email: savedUser.email
      }
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};

exports.editProfile = async (body, userId) => {
  try {
    const {
      userName, mobile, dob, gender,
      bio, title, ethnicity, languages, category, location
    } = body;

    const updateData = {};
    if (userName !== undefined) updateData.userName = userName;
    if (mobile !== undefined) {
      const existingMobile = await userModel.findOne({ mobile, _id: { $ne: userId } });
      if (existingMobile) throw new Error("Mobile number is already in use by another account");
      updateData.mobile = mobile;
    }
    if (dob !== undefined) updateData.dob = new Date(dob);
    if (gender !== undefined) updateData.gender = gender;

    let updatedUser = await userModel.findById(userId);
    if (!updatedUser) throw new Error("User not found");

    if (updatedUser.role === "brand") {
      // 🚫 Brand Restrictions: Brands can ONLY edit these details
      const {
        description, category, location, socialAccounts, cover_image
      } = body;

      const profileUpdateOps = {};
      if (location) {
        if (location.address !== undefined) profileUpdateOps["location.address"] = location.address;
        if (location.city !== undefined) profileUpdateOps["location.city"] = location.city;
        if (location.state !== undefined) profileUpdateOps["location.state"] = location.state;
        if (location.country !== undefined) profileUpdateOps["location.country"] = location.country;
      }
      if (description !== undefined) profileUpdateOps.description = description;
      if (category !== undefined) profileUpdateOps.category = category;
      if (socialAccounts !== undefined) {
        if (socialAccounts.website !== undefined) profileUpdateOps["socialAccounts.website"] = socialAccounts.website;
        if (socialAccounts.instagram !== undefined) profileUpdateOps["socialAccounts.instagram"] = socialAccounts.instagram;
        if (socialAccounts.youtube !== undefined) profileUpdateOps["socialAccounts.youtube"] = socialAccounts.youtube;
        if (socialAccounts.tiktok !== undefined) profileUpdateOps["socialAccounts.tiktok"] = socialAccounts.tiktok;
        if (socialAccounts.twitter !== undefined) profileUpdateOps["socialAccounts.twitter"] = socialAccounts.twitter;
      }
      if (cover_image !== undefined) profileUpdateOps.cover_image = cover_image;

      let profileData = null;
      if (Object.keys(profileUpdateOps).length > 0) {
        profileData = await brandProfileModel.findOneAndUpdate(
          { userId },
          { $set: profileUpdateOps },
          { new: true, upsert: true }
        );
      } else {
        profileData = await brandProfileModel.findOne({ userId });
      }

      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Brand profile updated successfully",
        data: {
          userId: updatedUser._id,
          email: updatedUser.email,
          userName: updatedUser.userName,
          profile: profileData || {},
        },
      };
    }

    // Default flow for Creators
    if (Object.keys(updateData).length > 0) {
      updatedUser = await userModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      );
    }

    let profileData = null;
    const profileModel = updatedUser.role === "creator" ? creatorProfileModel : brandProfileModel;

    const profileUpdateOps = {};
    if (location) {
      if (location.address !== undefined) profileUpdateOps["location.address"] = location.address;
      if (location.city !== undefined) profileUpdateOps["location.city"] = location.city;
      if (location.state !== undefined) profileUpdateOps["location.state"] = location.state;
      if (location.country !== undefined) profileUpdateOps["location.country"] = location.country;
    }

    if (updatedUser.role === "creator") {
      if (bio !== undefined) profileUpdateOps.bio = bio;
      if (title !== undefined) profileUpdateOps.title = title;
      if (ethnicity !== undefined) profileUpdateOps.ethnicity = ethnicity;
      if (languages !== undefined) profileUpdateOps.languages = languages;
      if (category !== undefined) profileUpdateOps.category = category;
    }

    if (Object.keys(profileUpdateOps).length > 0) {
      profileData = await profileModel.findOneAndUpdate(
        { userId },
        { $set: profileUpdateOps },
        { new: true, upsert: true }
      );
    } else {
      profileData = await profileModel.findOne({ userId });
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Profile updated successfully",
      data: {
        userId: updatedUser._id,
        email: updatedUser.email,
        dob: updatedUser.dob,
        gender: updatedUser.gender,
        userName: updatedUser.userName,
        profile: profileData || {},
      },
    };
  } catch (err) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.updateProfile = async (file, userId) => {
  try {
    if (!file) throw new Error("Profile image is required.");

    const user = await userModel.findById(userId);
    if (!user) throw new Error("User not found");

    const result = await uploadToCloudinary(file);
    const newProfileImage = {
      url: result.secure_url || result.url,
      public_id: result.public_id,
      provider: "cloudinary"
    };

    if (user.profile_image && user.profile_image.public_id) {
      try {
        await deleteFromCloudinary(user.profile_image.public_id, "image");
      } catch (error) {
        console.error("Failed to delete old profile image:", error);
      }
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: { profile_image: newProfileImage } },
      { new: true }
    );

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Profile image updated successfully",
      data: {
        userId: updatedUser._id,
        profile_image: updatedUser.profile_image,
      },
    };
  } catch (err) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.getProfile = async (userId) => {
  try {
    const user = await userModel.findById(userId).select('-password -token -isDeleted').lean();
    if (!user) {
      throw new Error("User not found");
    }

    let profileData = null;
    let socialAccounts = [];
    let services = [];
    let portfolio = [];

    if (user.role === "creator") {
      profileData = await creatorProfileModel.findOne({ userId }).lean();

      const mongoose = require("mongoose");
      const objUserId = new mongoose.Types.ObjectId(userId);

      socialAccounts = await socialAccountModel.aggregate([
        { $match: { creatorId: objUserId } },
        {
          $lookup: {
            from: "platforms",
            localField: "platform",
            foreignField: "_id",
            as: "platformInfo"
          }
        },
        { $unwind: { path: "$platformInfo", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            platform: {
              $cond: {
                if: { $not: ["$platformInfo"] },
                then: null,
                else: {
                  _id: "$platformInfo._id",
                  name: "$platformInfo.name",
                  key: "$platformInfo.key",
                  icon: "$platformInfo.icon"
                }
              }
            }
          }
        },
        { $project: { platformInfo: 0 } }
      ]);

      services = await serviceModel.aggregate([
        { $match: { creatorId: objUserId } },
        {
          $lookup: {
            from: "platforms",
            localField: "platform",
            foreignField: "_id",
            as: "platformInfo"
          }
        },
        { $unwind: { path: "$platformInfo", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "servicemasters",
            localField: "serviceType",
            foreignField: "_id",
            as: "serviceTypeInfo"
          }
        },
        { $unwind: { path: "$serviceTypeInfo", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            platform: {
              $cond: {
                if: { $not: ["$platformInfo"] },
                then: null,
                else: {
                  _id: "$platformInfo._id",
                  name: "$platformInfo.name",
                  key: "$platformInfo.key",
                  icon: "$platformInfo.icon"
                }
              }
            },
            serviceType: {
              $cond: {
                if: { $not: ["$serviceTypeInfo"] },
                then: null,
                else: {
                  _id: "$serviceTypeInfo._id",
                  title: "$serviceTypeInfo.title"
                }
              }
            }
          }
        },
        { $project: { platformInfo: 0, serviceTypeInfo: 0 } }
      ]);

      portfolio = await portfolioModel.find({ creatorId: userId })
        .sort({ createdAt: -1 })
        .lean();

      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Profile fetched successfully",
        data: {
          _id: user._id,
          userName: user.userName,
          email: user.email,
          mobile: user.mobile,
          profile_image: user.profile_image,
          isStatus: user.isStatus,
          user_verify: user.user_verify,
          role: user.role,
          approvalStatus: profileData ? profileData.approvalStatus : 0,
          rejectReason: profileData ? profileData.rejectReason : "",
          creatorProfile: profileData || {},
          socialAccounts,
          services,
          portfolio
        },
      };
    } else if (user.role === "brand") {
      profileData = await brandProfileModel.findOne({ userId }).lean();

      // Check if brand has an active subscription
      const activeSubscription = await subscriptionService.getActiveSubscription(userId);

      const freePlanArray = await Plan.aggregate([
        { $match: { name: "Basic", status: true } },
        {
          $lookup: {
            from: "features",
            localField: "features.featureId",
            foreignField: "_id",
            as: "featureDetails",
          },
        },
        {
          $addFields: {
            features: {
              $map: {
                input: "$features",
                as: "f",
                in: {
                  featureId: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$featureDetails",
                          as: "fd",
                          cond: { $eq: ["$$fd._id", "$$f.featureId"] },
                        },
                      },
                      0,
                    ],
                  },
                  limit: "$$f.limit",
                  value: "$$f.value",
                },
              },
            },
          },
        },
        { $project: { featureDetails: 0 } },
      ]);

      const planInfo = activeSubscription || {
        planId: freePlanArray[0],
        status: "active",
        isFreeTier: true,
      };

      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Profile fetched successfully",
        data: {
          _id: user._id,
          role: user.role,
          fullname: user.userName,
          brandname: profileData ? profileData.companyName : "",
          email: user.email,
          location: profileData ? profileData.location : {},
          description: profileData ? profileData.description : "",
          category: profileData ? profileData.category : [],
          socialMedia: profileData ? profileData.socialAccounts : {},
          coverImage: profileData ? profileData.cover_image : {},
          isSubscribed: !!activeSubscription,
          activeSubscription: planInfo
        },
      };
    }

  } catch (err) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.getCreatorDetails = async (creatorId, loggedInUserId = null) => {
  try {
    const user = await userModel.findById(creatorId).select('-password -token -isDeleted').lean();
    if (!user || user.role !== "creator") {
      throw new Error("Creator not found");
    }

    const profileData = await creatorProfileModel.findOne({ userId: creatorId }).lean();
    if (!profileData || (profileData.approvalStatus !== 1 && String(loggedInUserId) !== String(creatorId))) {
      throw new Error("Creator not found or not approved");
    }

    // --- Added Plan Limit Enforcement for Brands ---
    if (loggedInUserId) {
      const loggedUser = await userModel.findById(loggedInUserId);
      if (loggedUser && loggedUser.role === "brand") {
        // Only log/check if a brand views a creator's profile (not self)
        if (String(loggedInUserId) !== String(creatorId)) {
          const limitCheck = await subscriptionService.checkFeatureLimit(loggedInUserId, "Profile Access");
          if (!limitCheck.allowed) {
            return {
              statusCode: statusCode.FORBIDDEN,
              success: false,
              message: `You have reached your monthly profile access limit of ${limitCheck.limit} for the ${limitCheck.planName} plan. Please upgrade to view more profiles.`,
            };
          }
          // Log the profile view
          await subscriptionService.logActivity(loggedInUserId, "profile_view", creatorId);
        }
      }
    }
    // ----------------------------------------------

    const mongoose = require("mongoose");
    const objUserId = new mongoose.Types.ObjectId(creatorId);

    const socialAccounts = await socialAccountModel.aggregate([
      { $match: { creatorId: objUserId } },
      {
        $lookup: {
          from: "platforms",
          localField: "platform",
          foreignField: "_id",
          as: "platformInfo"
        }
      },
      { $unwind: { path: "$platformInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          platform: {
            $cond: {
              if: { $not: ["$platformInfo"] },
              then: null,
              else: {
                _id: "$platformInfo._id",
                name: "$platformInfo.name",
                key: "$platformInfo.key",
                icon: "$platformInfo.icon"
              }
            }
          }
        }
      },
      { $project: { platformInfo: 0 } }
    ]);

    const services = await serviceModel.aggregate([
      { $match: { creatorId: objUserId, approvalStatus: 1 } },
      {
        $lookup: {
          from: "platforms",
          localField: "platform",
          foreignField: "_id",
          as: "platformInfo"
        }
      },
      { $unwind: { path: "$platformInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servicemasters",
          localField: "serviceType",
          foreignField: "_id",
          as: "serviceTypeInfo"
        }
      },
      { $unwind: { path: "$serviceTypeInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          platform: {
            $cond: {
              if: { $not: ["$platformInfo"] },
              then: null,
              else: {
                _id: "$platformInfo._id",
                name: "$platformInfo.name",
                key: "$platformInfo.key",
                icon: "$platformInfo.icon"
              }
            }
          },
          serviceType: {
            $cond: {
              if: { $not: ["$serviceTypeInfo"] },
              then: null,
              else: {
                _id: "$serviceTypeInfo._id",
                title: "$serviceTypeInfo.title"
              }
            }
          }
        }
      },
      { $project: { platformInfo: 0, serviceTypeInfo: 0 } }
    ]);

    const portfolio = await portfolioModel.find({ creatorId }).sort({ createdAt: -1 }).lean();

    let isFavorite = false;
    if (loggedInUserId) {
      const favoriteCount = await favoriteModel.countDocuments({
        userId: loggedInUserId,
        creatorId: creatorId
      });
      isFavorite = favoriteCount > 0;
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creator details fetched successfully",
      data: {
        _id: user._id,
        userName: user.userName,
        profile_image: user.profile_image,
        approvalStatus: profileData ? profileData.approvalStatus : 0,
        rejectReason: profileData ? profileData.rejectReason : "",
        creatorProfile: profileData || {},
        socialAccounts,
        services,
        portfolio,
        isFavorite
      },
    };
  } catch (err) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.getCreator = async (creatorId) => {
  try {
    const user = await userModel.findById(creatorId).select("userName email mobile profile_image role isDeleted").lean();
    if (!user || user.role !== "creator" || user.isDeleted) {
      throw new Error("Creator not found");
    }

    const profile = await creatorProfileModel.findOne({ userId: creatorId }).lean();
    if (!profile) {
      throw new Error("Creator profile not found");
    }

    // Resolve Category IDs to Names if they are ObjectIDs
    let categoryNames = profile.category || [];
    if (categoryNames.length > 0) {
      const mongoose = require("mongoose");
      const validCategoryIds = categoryNames.filter(id => mongoose.Types.ObjectId.isValid(id));
      const nonObjectIdCategories = categoryNames.filter(id => !mongoose.Types.ObjectId.isValid(id));

      if (validCategoryIds.length > 0) {
        const categories = await Category.find({ _id: { $in: validCategoryIds } }).select("name").lean();
        categoryNames = [...new Set([...categories.map(c => c.name), ...nonObjectIdCategories])];
      }
    }

    const mongoose = require("mongoose");
    const socialAccounts = await socialAccountModel.aggregate([
      { $match: { creatorId: new mongoose.Types.ObjectId(creatorId) } },
      {
        $lookup: {
          from: "platforms",
          localField: "platform",
          foreignField: "_id",
          as: "platformInfo"
        }
      },
      { $unwind: { path: "$platformInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          platform: "$platformInfo.name",
          handle: 1,
          followers: 1
        }
      }
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creator info fetched successfully",
      data: {
        userName: user.userName,
        email: user.email,
        phone: user.mobile,
        profileImage: user.profile_image ? user.profile_image.url : "",
        gender: profile.gender || "",
        ethnicity: profile.ethnicity || "",
        title: profile.title || "",
        bio: profile.bio || "",
        category: categoryNames,
        language: profile.languages || [],
        location: profile.location || {},
        socialAccounts: socialAccounts,
        approvalStatus: profile.approvalStatus || 0,
        rejectReason: profile.rejectReason || ""
      }
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};


exports.logout = async (userId) => {
  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: { token: "" } },
      { new: true, lean: true }
    );
    if (!updatedUser) {
      return {
        success: false,
        message: "User not found.",
        data: {},
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Logged out successfully!",
      data: {},
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: "Logout failed.",
      data: {},
    };
  }
};

exports.addPortfolioItem = async (files, userId) => {
  try {
    if (!files || files.length === 0) throw new Error("At least one media file is required.");

    const uploadPromises = files.map(file => uploadToCloudinary(file));
    const uploadResults = await Promise.all(uploadPromises);

    const portfolioItems = uploadResults.map(result => ({
      creatorId: userId,
      media: {
        url: result.secure_url || result.url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        provider: "cloudinary"
      }
    }));

    const newPortfolios = await portfolioModel.insertMany(portfolioItems);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: `${newPortfolios.length} portfolio item(s) added successfully`,
      data: newPortfolios,
    };
  } catch (err) {
    console.error("❌ Error in addPortfolioItem:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.getPortfolioItems = async (userId) => {
  try {
    const portfolio = await portfolioModel.find({ creatorId: userId }).sort({ createdAt: -1 });
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Portfolio fetched successfully",
      data: portfolio,
    };
  } catch (err) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.removePortfolioItem = async (portfolioId, userId) => {
  try {
    const portfolio = await portfolioModel.findOne({ _id: portfolioId, creatorId: userId });

    if (!portfolio) {
      throw new Error("Portfolio item not found or you don't have permission to delete it.");
    }

    if (portfolio.media && portfolio.media.public_id) {
      try {
        await deleteFromCloudinary(portfolio.media.public_id, portfolio.media.resource_type || "image");
      } catch (error) {
        console.error("Failed to delete media from cloudinary:", error);
      }
    }

    await portfolioModel.findByIdAndDelete(portfolioId);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Portfolio item deleted successfully",
      data: portfolio,
    };
  } catch (err) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.searchCreators = async (reqQuery, loggedInUserId = null) => {
  try {
    // --- Plan Limit Enforcement for Brands (only when actual filters are applied) ---
    if (loggedInUserId) {
      const loggedUser = await userModel.findById(loggedInUserId);
      if (loggedUser && loggedUser.role === "brand") {
        // Only count as a "search" when real filter params are provided (not just page/limit/isFeatured)
        const EXCLUDED_PARAMS = new Set(["page", "limit", "isFeatured"]);
        const hasFilters = Object.keys(reqQuery).some(key => !EXCLUDED_PARAMS.has(key));

        if (hasFilters) {
          const limitCheck = await subscriptionService.checkFeatureLimit(loggedInUserId, "Search & Discovery");
          if (!limitCheck.allowed) {
            return {
              statusCode: statusCode.FORBIDDEN,
              success: false,
              message: `You have reached your monthly search limit of ${limitCheck.limit} for the ${limitCheck.planName} plan. Please upgrade to search more creators.`,
            };
          }
          // Log the search activity
          await subscriptionService.logActivity(loggedInUserId, "search", null, reqQuery);
        }
      }
    }
    // ---------------------------------------------------------------------------------


    const {
      platform, category, serviceType, location, minFollowers, maxFollowers, minPrice, maxPrice, gender, minAge, maxAge, ethnicity, language, isFeatured, page = 1, limit = 10
    } = reqQuery;

    let userMatch = { role: "creator", isDeleted: false, isBlocked: false };

    if (minAge || maxAge) {
      const today = new Date();
      let dobFilter = {};
      if (minAge) {
        dobFilter.$lte = new Date(today.getFullYear() - Number(minAge), today.getMonth(), today.getDate());
      }
      if (maxAge) {
        dobFilter.$gte = new Date(today.getFullYear() - Number(maxAge) - 1, today.getMonth(), today.getDate() + 1);
      }
      userMatch.dob = dobFilter;
    }

    let pipeline = [
      { $match: userMatch }
    ];

    pipeline.push({
      $lookup: {
        from: "creatorprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile"
      }
    });
    pipeline.push({ $unwind: { path: "$profile", preserveNullAndEmptyArrays: false } });

    let profileMatch = { "profile.approvalStatus": 1 };
    if (category) profileMatch["profile.category"] = { $in: Array.isArray(category) ? category : category.split(',') };
    if (gender) profileMatch["profile.gender"] = { $in: Array.isArray(gender) ? gender : gender.split(',') };
    if (ethnicity) profileMatch["profile.ethnicity"] = ethnicity;
    if (language) profileMatch["profile.languages"] = { $in: Array.isArray(language) ? language : language.split(',') };
    if (location) {
      const regex = new RegExp(location, "i");
      profileMatch["$or"] = [
        { "profile.location.country": regex },
        { "profile.location.state": regex },
        { "profile.location.city": regex }
      ];
    }
    if (isFeatured !== undefined) {
      profileMatch["profile.isFeatured"] = isFeatured === "true";
    }

    if (Object.keys(profileMatch).length > 0) {
      pipeline.push({ $match: profileMatch });
    }

    let platformDoc = null;
    let sTypeDoc = null;
    if (platform) {
      platformDoc = await platformModel.findOne({ key: platform.toLowerCase() });
      if (!platformDoc) {
        return { statusCode: 200, success: true, message: "No creators found", data: [], total: 0, page: 1, totalPages: 0 };
      }
      if (serviceType) {
        sTypeDoc = await serviceTypeModel.findOne({ title: serviceType, platform: platformDoc._id });
      }
    }

    let socialPipeline = [
      { $match: { $expr: { $eq: ["$creatorId", "$$userId"] } } },
      {
        $lookup: {
          from: "platforms",
          localField: "platform",
          foreignField: "_id",
          as: "platformInfo"
        }
      },
      { $unwind: { path: "$platformInfo", preserveNullAndEmptyArrays: true } }
    ];
    let servicePipeline = [
      { $match: { $expr: { $eq: ["$creatorId", "$$userId"] }, approvalStatus: 1 } }
    ];

    if (platformDoc) {
      socialPipeline.push({ $match: { platform: platformDoc._id } });
      if (minFollowers || maxFollowers) {
        let fMatch = {};
        if (minFollowers) fMatch.$gte = Number(minFollowers);
        if (maxFollowers) fMatch.$lte = Number(maxFollowers);
        socialPipeline.push({ $match: { followers: fMatch } });
      }

      servicePipeline.push({ $match: { platform: platformDoc._id } });
      if (serviceType) {
        if (sTypeDoc) {
          servicePipeline.push({ $match: { serviceType: sTypeDoc._id } });
        } else {
          servicePipeline.push({ $match: { _id: null } });
        }
      }
    }

    if (minPrice || maxPrice) {
      let pMatch = {};
      if (minPrice) pMatch.$gte = Number(minPrice);
      if (maxPrice) pMatch.$lte = Number(maxPrice);
      servicePipeline.push({ $match: { price: pMatch } });
    }

    pipeline.push({
      $lookup: {
        from: "socialaccounts",
        let: { userId: "$_id" },
        pipeline: socialPipeline,
        as: "socials"
      }
    });

    pipeline.push({
      $lookup: {
        from: "services",
        let: { userId: "$_id" },
        pipeline: servicePipeline,
        as: "services"
      }
    });

    // Add Portfolio lookup
    pipeline.push({
      $lookup: {
        from: "portfolios",
        localField: "_id",
        foreignField: "creatorId",
        as: "portfolio"
      }
    });

    let postLookupMatch = {};
    if (platformDoc) {
      let hasFollowerFilter = minFollowers != null || maxFollowers != null;
      let hasServiceFilter = serviceType != null || minPrice != null || maxPrice != null;

      if (hasFollowerFilter && hasServiceFilter) {
        postLookupMatch["socials.0"] = { $exists: true };
        postLookupMatch["services.0"] = { $exists: true };
      } else if (hasFollowerFilter) {
        postLookupMatch["socials.0"] = { $exists: true };
      } else if (hasServiceFilter) {
        postLookupMatch["services.0"] = { $exists: true };
      } else {
        postLookupMatch["$or"] = [
          { "socials.0": { $exists: true } },
          { "services.0": { $exists: true } }
        ];
      }
    } else {
      if (minPrice != null || maxPrice != null) {
        postLookupMatch["services.0"] = { $exists: true };
      }
    }

    if (Object.keys(postLookupMatch).length > 0) {
      pipeline.push({ $match: postLookupMatch });
    }

    // Optional: Attach Favorite checking if user is logged in
    if (loggedInUserId) {
      const mongoose = require("mongoose");
      pipeline.push({
        $lookup: {
          from: "favorites",
          let: { cId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$creatorId", "$$cId"] },
                    { $eq: ["$userId", new mongoose.Types.ObjectId(loggedInUserId)] }
                  ]
                }
              }
            }
          ],
          as: "favoriteData"
        }
      });
    }

    // Clean up and Project response fields for Card
    pipeline.push({
      $project: {
        name: "$userName",
        profile_image: 1,
        media: { $arrayElemAt: ["$portfolio.media", 0] },
        socialAccount: {
          $let: {
            vars: {
              topAccount: { $arrayElemAt: [{ $sortArray: { input: "$socials", sortBy: { followers: -1 } } }, 0] }
            },
            in: {
              platform: "$$topAccount.platformInfo.name",
              platformKey: "$$topAccount.platformInfo.key",
              platformIcon: "$$topAccount.platformInfo.icon",
              handle: "$$topAccount.handle",
              followers: "$$topAccount.followers"
            }
          }
        },
        rating: { $ifNull: ["$profile.rating", 0] },
        isTopCreator: { $ifNull: ["$profile.isTopCreator", false] },
        title: { $ifNull: ["$profile.title", ""] },
        location: {
          $concat: [
            { $ifNull: ["$profile.location.city", ""] },
            { $cond: [{ $and: ["$profile.location.city", "$profile.location.state"] }, ", ", ""] },
            { $ifNull: ["$profile.location.state", ""] },
            { $cond: [{ $and: ["$profile.location.state", "$profile.location.country"] }, ", ", ""] },
            { $ifNull: ["$profile.location.country", ""] }
          ]
        },
        price: { $min: "$services.price" },
        approvalStatus: "$profile.approvalStatus",
        gender: "$profile.gender",
        isFavorite: loggedInUserId
          ? { $gt: [{ $size: { $ifNull: ["$favoriteData", []] } }, 0] }
          : { $literal: false }
      }
    });

    const skip = (Number(page) - 1) * Number(limit);

    // Setup count pipeline
    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    const [creators, totalResult] = await Promise.all([
      userModel.aggregate(pipeline),
      userModel.aggregate(countPipeline)
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creators fetched successfully",
      data: creators,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};

exports.resendOtp = async (mobile) => {
  try {
    if (!mobile) {
      return {
        success: false,
        message: "Mobile number is required",
      };
    }
    let user = await userModel.findOne({ mobile });
    // 🔍 Find user by mobile number
    if (!user) {
      return {
        success: false,
        message: "User not found. Please register first.",
      };
    }

    // 🔁 Generate new OTP & expiry
    let otp = generateOtp();
    // let otp = 123456;

    await userModel.findByIdAndUpdate(user._id, {
      otp
    });

    await sendOtp(mobile, otp);
    // ✉️ (optional) send OTP via SMS Gateway
    console.log(`📲 OTP for ${mobile}: ${otp} `);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Otp_Send_Success || "OTP resent successfully",
      data: {
        userId: user._id,
        otp,
      },
    };
  } catch (err) {
    console.error("❌ Error in resendOtp:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.requestPanKyc = async (userId, body) => {
  try {
    const { pan_number, pan_name, pan_dob } = body;
    const now = new Date();

    const findUser = await userModel.findOne({
      "pancard.pan_number": pan_number,
      "pancard.status": 1,
      _id: { $ne: userId },
    });
    if (findUser) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "This Pan is already registered with another Account.",
        data: {},
      };
    }

    const update = {
      pancard: {
        pan_name: pan_name || "",
        pan_number,
        pan_dob: pan_dob || "",
        status: 0, // pending
        comment: "",
        created_at: now,
        updated_at: now,
      },
      "user_verify.pan_verify": 0, // pending
      "user_verify.updated_at": now,
    };

    const user = await userModel.findByIdAndUpdate(userId, update, { new: true });
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Your pan card request has been successfully sent.",
      data: {
        pan: user.pancard,
        user_verify: user.user_verify,
      },
    };
  } catch (err) {
    console.error("❌ requestPanKyc error:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.requestAadhaarKyc = async (userId, body) => {
  try {
    const { aadhar_number, manualKyc = false, aadhar_name } = body;

    const findUser = await userModel.findOne({
      "aadharcard.aadhar_number": aadhar_number,
      "aadharcard.status": 1,
      _id: { $ne: userId },
    });

    if (findUser) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "This Aadhaar is already registered with another Account.",
        data: {},
      };
    }

    const now = new Date();

    const update = {
      aadharcard: {
        aadhar_name: aadhar_name || "",
        aadhar_number,
        aadhar_dob: "",
        status: 0, // pending
        comment: "",
        created_at: now,
        updated_at: now,
        manualKyc: !!manualKyc,
      },
      "user_verify.aadhar_verify": 0,
      "user_verify.updated_at": now,
    };

    const user = await userModel.findByIdAndUpdate(userId, update, {
      new: true,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Your aadhaar card request has been successfully sent.",
      data: {
        aadhar: user.aadharcard,
        user_verify: user.user_verify,
      },
    };
  } catch (err) {
    console.error("❌ requestAadhaarKyc error:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.requestBankKyc = async (userId, body) => {
  try {
    const { accountholder, accno, ifsc, bankname, bankbranch, state, city } = body;

    // Check if bank account belongs to someone else
    const existingUser = await userModel.findOne({
      "bank.accno": accno,
      "bank.status": 1,
      _id: { $ne: userId },
    });

    if (existingUser) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "This Bank Account is already registered with another account.",
        data: {},
      };
    }

    const now = new Date();

    // ---- UPDATE BANK DATA ----
    const user = await userModel.findByIdAndUpdate(userId, {
      $set: {
        "bank.accountholder": accountholder,
        "bank.accno": accno,
        "bank.ifsc": ifsc,
        "bank.bankname": bankname || "",
        "bank.bankbranch": bankbranch || "",
        "bank.state": state || "",
        "bank.city": city || "",
        "bank.status": 0, // Pending
        "bank.comment": "",
        "bank.created_at": now,
        "bank.updated_at": now,
        "user_verify.bank_verify": 0,
      },
    }, { new: true });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Your bank request has been successfully sent.",
      data: {
        bank: user.bank,
        user_verify: user.user_verify,
      },
    };
  } catch (err) {
    console.error("❌ requestBankKyc error:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.requestEmailVerify = async (userId, email) => {
  try {
    const now = new Date();
    const checkEmail = await userModel.findOne({
      email: email.toLowerCase(),
      _id: { $ne: userId }, // Exclude current user
    });
    if (checkEmail) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Email is already in use by another account",
      };
    }
    const otp = generateOtp();
    const update = {
      otp: otp,
      email: email.toLowerCase(),
      "user_verify.email_verify": 0, // pending
      "user_verify.updated_at": now,
    };

    const user = await userModel.findByIdAndUpdate(userId, update, {
      new: true,
    });

    if (!user) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "User not found",
      };
    }
    await sentOtp(email, "Email Verification OTP", otp);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Email submitted for verification and otp is sent to email",
      data: {
        email: user.email,
        user_verify: user.user_verify,
      },
    };
  } catch (err) {
    console.error("❌ requestEmailVerify error:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.verifyEmailOtp = async (userId, email, otp) => {
  try {

    const user = await userModel.findById(userId);
    if (!user) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "User not found",
      };
    }

    if (user.email !== email.toLowerCase()) {
      return {
        success: false,
        message: "Email does not match the one on record",
      };
    }

    if (user.otp !== otp) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid OTP",
      };
    }

    // Update email verification status and clear OTP
    user.user_verify.email_verify = 1; // verified
    user.otp = "";

    // Sync isStatus
    const uv = user.user_verify;
    user.isStatus = uv.pan_verify === 1 &&
      uv.aadhar_verify === 1 &&
      uv.bank_verify === 1 &&
      uv.email_verify === 1 &&
      uv.mobile_verify === 1;

    await user.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Email verified successfully",
      data: {
        email: user.email,
        user_verify: user.user_verify,
        isStatus: user.isStatus
      },
    };
  } catch (err) {
    console.error("❌ verifyEmailOtp error:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.requestMobileVerify = async (userId, mobile) => {
  try {
    const now = new Date();
    const checkMobile = await userModel.findOne({
      mobile,
      _id: { $ne: userId },
    });
    if (checkMobile) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Mobile number is already in use by another account",
      };
    }
    const otp = generateOtp();
    const update = {
      otp: otp,
      mobile: mobile,
      "user_verify.mobile_verify": 0, // pending
      "user_verify.updated_at": now,
    };

    const user = await userModel.findByIdAndUpdate(userId, update, {
      new: true,
    });

    if (!user) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "User not found",
      };
    }
    await sendOtp(mobile, otp);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Mobile submitted for verification and otp is sent to mobile",
      data: {
        mobile: user.mobile,
        user_verify: user.user_verify,
      },
    };
  } catch (err) {
    console.error("❌ requestMobileVerify error:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.verifyMobileOtp = async (userId, mobile, otp) => {
  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "User not found",
      };
    }

    if (Number(user.mobile) !== Number(mobile)) {
      return {
        success: false,
        message: "Mobile number does not match the one on record",
      };
    }

    if (user.otp !== otp) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Invalid OTP",
      };
    }

    // Update mobile verification status and clear OTP
    user.user_verify.mobile_verify = 1; // verified
    user.isPhoneVerify = true;
    user.otp = "";

    // Sync isStatus
    const uv = user.user_verify;
    user.isStatus = uv.pan_verify === 1 &&
      uv.aadhar_verify === 1 &&
      uv.bank_verify === 1 &&
      uv.email_verify === 1 &&
      uv.mobile_verify === 1;

    await user.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Mobile verified successfully",
      data: {
        mobile: user.mobile,
        user_verify: user.user_verify,
        isStatus: user.isStatus
      },
    };
  } catch (err) {
    console.error("❌ verifyMobileOtp error:", err);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.updateCoverImage = async (file, userId) => {
  try {
    if (!file) throw new Error("Cover image is required.");

    const user = await userModel.findById(userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "brand") throw new Error("Only brands can have a cover image.");

    const result = await uploadToCloudinary(file);
    const newCoverImage = {
      url: result.secure_url || result.url,
      public_id: result.public_id,
      provider: "cloudinary"
    };

    const profile = await brandProfileModel.findOne({ userId });
    if (profile && profile.cover_image && profile.cover_image.public_id) {
      try {
        await deleteFromCloudinary(profile.cover_image.public_id, "image");
      } catch (error) {
        console.error("Failed to delete old cover image:", error);
      }
    }

    const updatedProfile = await brandProfileModel.findOneAndUpdate(
      { userId },
      { $set: { cover_image: newCoverImage } },
      { new: true, upsert: true }
    );

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Cover image updated successfully",
      data: {
        userId: userId,
        cover_image: updatedProfile.cover_image,
      },
    };
  } catch (err) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: err.message,
    };
  }
};

exports.requestProfileApproval = async (userId) => {
  try {
    const profile = await creatorProfileModel.findOne({ userId });
    if (!profile) {
      throw new Error("Creator profile not found.");
    }

    if (profile.approvalStatus === 1) {
      throw new Error("Profile is already approved.");
    }

    if (profile.approvalStatus === 0) {
      throw new Error("Profile approval is already pending.");
    }

    profile.approvalStatus = 0; // Set to Pending
    profile.rejectReason = ""; // Clear reject reason
    await profile.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Profile approval set to pending successfully.",
      data: {
        approvalStatus: profile.approvalStatus
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

exports.checkEmail = async (email) => {
  try {
    if (!email) {
      throw new Error("Email is required.");
    }
    const existingUser = await userModel.findOne({ email, isDeleted: false });
    if (existingUser) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Email is already registered."
      };
    }
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Email is available."
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message
    };
  }
};
