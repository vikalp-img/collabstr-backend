const reviewService = require("../services/reviewService");
const { statusCode } = require("../../config/default.json");


exports.addReview = async (req) => {
  try {
    const { orderId, itemId, rating, comment } = req.body;
    const brandId = req.user._id;

    if (!orderId || !itemId || !rating) {
      throw new Error("Missing required fields: orderId, itemId, and rating are mandatory.");
    }

    return await reviewService.addReview(brandId, orderId, itemId, rating, comment);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getCreatorReviews = async (req) => {
  try {
    const { creatorId } = req.params;

    if (!creatorId) {
      throw new Error("Creator ID is required.");
    }

    return await reviewService.getCreatorReviews(creatorId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.editReview = async (req) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const brandId = req.user._id;

    if (!reviewId || !rating) {
      throw new Error("Missing required fields: reviewId and rating are mandatory.");
    }

    return await reviewService.editReview(brandId, reviewId, rating, comment);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteReview = async (req) => {
  try {
    const { reviewId } = req.params;
    const brandId = req.user._id;

    if (!reviewId) {
      throw new Error("Review ID is required.");
    }

    return await reviewService.deleteReview(brandId, reviewId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
