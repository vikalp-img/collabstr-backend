const footerLinkModel = require("../../models/footerLinkModel");
const { statusCode } = require("../../config/default.json");

exports.getFooterLinks = async () => {
  try {
    let footerLinks = await footerLinkModel.findOne({});

    if (!footerLinks) {
      // Create a default document if none exists
      footerLinks = await footerLinkModel.create({
        email: { value: "", isActive: true },
        phone: { value: "", isActive: true },
        address: { value: "", isActive: true },
        socialLinks: [
          { platform: "instagram", url: "", isActive: true },
          { platform: "youtube", url: "", isActive: true },
          { platform: "tiktok", url: "", isActive: true },
          { platform: "twitter", url: "", isActive: true },
          { platform: "linkedin", url: "", isActive: true },
          { platform: "facebook", url: "", isActive: true },
        ],
      });
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Footer links fetched successfully",
      data: footerLinks,
    };
  } catch (error) {
    console.error("❌ Error in getFooterLinks:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.upsertFooterLinks = async (req) => {
  try {
    const { email, phone, address, socialLinks, socialLink } = req.body;

    let footerLinks = await footerLinkModel.findOne({});

    if (footerLinks) {
      // Update existing
      if (email !== undefined) footerLinks.email = email;
      if (phone !== undefined) footerLinks.phone = phone;
      if (address !== undefined) footerLinks.address = address;

      // Update all social links at once
      if (socialLinks !== undefined) footerLinks.socialLinks = socialLinks;

      // Update a single social link by _id or platform
      if (socialLink !== undefined) {
        const match = socialLink._id
          ? footerLinks.socialLinks.id(socialLink._id)
          : footerLinks.socialLinks.find((s) => s.platform === socialLink.platform);

        if (match) {
          if (socialLink.url !== undefined) match.url = socialLink.url;
          if (socialLink.isActive !== undefined) match.isActive = socialLink.isActive;
        } else {
          return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: "Social link not found",
          };
        }
      }

      await footerLinks.save();
    } else {
      // Create new
      footerLinks = await footerLinkModel.create({
        email: email || { value: "", isActive: true },
        phone: phone || { value: "", isActive: true },
        address: address || { value: "", isActive: true },
        socialLinks: socialLinks || [
          { platform: "instagram", url: "", isActive: true },
          { platform: "youtube", url: "", isActive: true },
          { platform: "tiktok", url: "", isActive: true },
          { platform: "twitter", url: "", isActive: true },
          { platform: "linkedin", url: "", isActive: true },
          { platform: "facebook", url: "", isActive: true },
        ],
      });
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Footer links updated successfully",
      data: footerLinks,
    };
  } catch (error) {
    console.error("❌ Error in upsertFooterLinks:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.toggleFooterLinkStatus = async (req) => {
  try {
    const { field, socialLinkId, isActive } = req.body;

    const footerLinks = await footerLinkModel.findOne({});

    if (!footerLinks) {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Footer links not found. Please create them first.",
      };
    }

    if (socialLinkId) {
      // Toggle a specific social link
      const socialLink = footerLinks.socialLinks.id(socialLinkId);
      if (!socialLink) {
        return {
          statusCode: statusCode.BAD_REQUEST,
          success: false,
          message: "Social link not found",
        };
      }
      socialLink.isActive = isActive;
    } else if (field && ["email", "phone", "address"].includes(field)) {
      // Toggle a contact info field
      footerLinks[field].isActive = isActive;
    } else {
      return {
        statusCode: statusCode.BAD_REQUEST,
        success: false,
        message: "Please provide a valid field (email, phone, address) or socialLinkId",
      };
    }

    await footerLinks.save();

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Status updated successfully",
      data: footerLinks,
    };
  } catch (error) {
    console.error("❌ Error in toggleFooterLinkStatus:", error);
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
