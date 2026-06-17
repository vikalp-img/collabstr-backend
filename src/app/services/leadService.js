const Lead = require("../../models/leadModel");
const { statusCode } = require("../../config/default.json");

exports.subscribe = async (data) => {
  try {
    const { email } = data;

    if (!email) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Email is required",
      };
    }

    const emailLower = email.trim().toLowerCase();
    let lead = await Lead.findOne({ email: emailLower });

    if (lead) {
      if (lead.status === "active") {
        return {
          statusCode: statusCode.OK,
          success: true,
          message: "You are already subscribed to our newsletter.",
          data: lead,
        };
      }

      // Reactivate unsubscribed lead
      lead.status = "active";
      lead.unsubscribedAt = null;
      lead.subscribedAt = new Date();
      await lead.save();

      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Welcome back! Your subscription has been reactivated.",
        data: lead,
      };
    }

    // Create new lead
    const newLead = await Lead.create({
      email: emailLower,
    });

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Thank you for subscribing to our newsletter!",
      data: newLead,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};

exports.unsubscribe = async (data) => {
  try {
    const { email } = data;

    if (!email) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Email is required",
      };
    }

    const lead = await Lead.findOne({ email: email.trim().toLowerCase() });

    if (!lead) {
      return {
        statusCode: statusCode.NOT_FOUND,
        success: false,
        message: "Email not found in our subscription list.",
      };
    }

    if (lead.status === "unsubscribed") {
      return {
        statusCode: statusCode.OK,
        success: true,
        message: "You are already unsubscribed.",
        data: lead,
      };
    }

    lead.status = "unsubscribed";
    lead.unsubscribedAt = new Date();
    await lead.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "You have been successfully unsubscribed.",
      data: lead,
    };
  } catch (error) {
    return {
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      success: false,
      message: error.message,
    };
  }
};
