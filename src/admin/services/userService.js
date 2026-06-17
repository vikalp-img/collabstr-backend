const adminModel = require("../../models/adminModel");
const userModel = require("../../models/userModel");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const devConfig = require("../../config/dev.config");
const { statusCode, resMessage } = require("../../config/default.json");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../helpers/uploadToCloudinary");


exports.login = async (body) => {
  try {
    const normalizedEmail = body.email.toLowerCase().trim();
    if (!normalizedEmail || !body.password) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: resMessage.Email_Password_Required,
      };
    }

    const chkUser = await adminModel.findOne({ email: normalizedEmail });

    if (!chkUser) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: resMessage.User_Not_Exist,
      };
    }

    if (chkUser.isBlocked) {
      return {
        statusCode: statusCode.FORBIDDEN,
        success: false,
        message: resMessage.Your_Account_is_Blocked,
      };
    }

    const isMatch = await bcrypt.compare(body.password, chkUser.password);

    if (isMatch) {
      let obj = {
        token: jwt.sign(
          { _id: chkUser._id, email: chkUser.email },
          devConfig.JWT_KEY,
        ),
        appKey: body?.appKey,
        loginDate: new Date(),
        loginStatus: true,
      };
      const data = await adminModel.findByIdAndUpdate(chkUser._id, obj, {
        new: true,
      });

      return {
        statusCode: statusCode.OK,
        success: true,
        message: resMessage.Admin_Login_Success,
        data: {
          userId: data._id,
          token: data.token,
          permissions: data.permissions,
        },
      };
    } else {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: resMessage.Incorrect_Email_Password,
      };
    }
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.logout = async (adminId) => {
  try {
    const admin = await adminModel.findById(adminId);
    if (!admin) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: resMessage.Admin_Not_Found || "Admin not found",
      };
    }

    await adminModel.findByIdAndUpdate(adminId, {
      token: "",
      loginStatus: false
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Logged out successfully",
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.resetPassword = async (adminId, body) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Old password, new password and confirm password are required",
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: resMessage.New_Password_Not_Match,
      };
    }

    const admin = await adminModel.findById(adminId);

    if (!admin) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: resMessage.Admin_Not_Found,
      };
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.password);

    if (!isMatch) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: resMessage.Current_Password_Incorrect,
      };
    }

    if (oldPassword === newPassword) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: resMessage.New_Password_Same_As_Current,
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await adminModel.findByIdAndUpdate(adminId, { password: hashedPassword });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: resMessage.Change_Password_Success,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getProfile = async (adminId) => {
  try {
    const admin = await adminModel
      .findById(adminId)
      .select("-password -token -__v")
      .lean();

    if (!admin) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: resMessage.Admin_Not_Found || "Admin not found",
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Admin profile retrieved successfully",
      data: admin,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateProfile = async (adminId, body, file) => {
  try {
    const existingAdmin = await adminModel.findById(adminId);
    if (!existingAdmin) {
      return {
        statusCode: statusCode.DATA_NOT_FOUND,
        success: false,
        message: resMessage.Admin_Not_Found || "Admin not found",
      };
    }

    const { name, phone, profile_image, email } = body;

    if (email !== undefined) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Email Cannot be changed here.",
      };
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (profile_image !== undefined) {
      if (typeof profile_image === 'string') {
        updateData.profile_image = {
          url: profile_image,
          public_id: "",
          provider: "url"
        };
      } else {
        updateData.profile_image = profile_image;
      }
    }

    if (file) {
      console.log("File received for Cloudinary upload:", file.originalname);
      const uploadResult = await uploadToCloudinary(file);
      console.log("Cloudinary upload result:", uploadResult);
      updateData.profile_image = {
        url: uploadResult.secure_url || uploadResult.url,
        public_id: uploadResult.public_id,
        provider: "cloudinary"
      };

      // Delete the old profile image from Cloudinary if it exists
      if (
        existingAdmin.profile_image &&
        existingAdmin.profile_image.public_id &&
        existingAdmin.profile_image.provider === "cloudinary"
      ) {
        try {
          await deleteFromCloudinary(existingAdmin.profile_image.public_id);
          console.log(`Deleted previous profile image from Cloudinary: ${existingAdmin.profile_image.public_id}`);
        } catch (delError) {
          console.error("Failed to delete previous profile image from Cloudinary:", delError);
        }
      }
    }

    console.log("Final updateData before DB update:", updateData);

    const admin = await adminModel.findByIdAndUpdate(
      adminId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password -token -__v").lean();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Admin profile updated successfully",
      data: admin,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
