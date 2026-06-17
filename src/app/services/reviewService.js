const Review = require("../../models/reviewModel");
const Order = require("../../models/orderModel");
const CreatorProfile = require("../../models/creatorProfileModel");
const { statusCode } = require("../../config/default.json");
const mongoose = require("mongoose");


exports.updateCreatorAverageRating = async (creatorId) => {
  try {
    const stats = await Review.aggregate([
      { $match: { creatorId: new mongoose.Types.ObjectId(creatorId) } },
      {
        $group: {
          _id: "$creatorId",
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const averageRating = stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0;

    await CreatorProfile.findOneAndUpdate(
      { userId: creatorId },
      { $set: { rating: averageRating } },
      { new: true, upsert: true }
    );

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Review submitted successfully.",
      data: averageRating,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.addReview = async (brandId, orderId, itemId, rating, comment) => {
  try {
    // 1. Verify order item exists and belongs to brand
    const order = await Order.findOne({ _id: orderId, brandId });
    if (!order) {
      throw new Error("Order not found or unauthorized.");
    }

    const item = order.items.id(itemId);
    if (!item) {
      throw new Error("Order item not found in this order.");
    }

    // 2. Business Rule: Only review completed tasks
    if (item.status !== "completed") {
      throw new Error(`Review can only be submitted after the item is 'completed' (current status: ${item.status}).`);
    }

    // 3. Check for existing review to prevent duplicates
    const existingReview = await Review.findOne({ orderId, itemId });
    if (existingReview) {
      throw new Error("A review has already been submitted for this order item.");
    }

    // 4. Create the review
    const review = await Review.create({
      orderId,
      itemId,
      brandId,
      creatorId: item.creatorId,
      rating: Number(rating),
      comment: comment || "",
    });

    // 5. Recalculate creator's global average rating
    await this.updateCreatorAverageRating(item.creatorId);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Review submitted successfully.",
      data: review,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getCreatorReviews = async (creatorId) => {
  try {
    const objCreatorId = new mongoose.Types.ObjectId(creatorId);

    // 1. Fetch current average rating
    const profile = await CreatorProfile.findOne({ userId: creatorId }, { rating: 1 });
    const averageRating = profile ? profile.rating : 0;

    // 2. Fetch reviews with detailed metadata
    const reviews = await Review.aggregate([
      { $match: { creatorId: objCreatorId } },
      {
        $lookup: {
          from: "users",
          localField: "brandId",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: { path: "$brandInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "orderInfo",
        },
      },
      { $unwind: { path: "$orderInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          specificItem: {
            $filter: {
              input: "$orderInfo.items",
              as: "item",
              cond: { $eq: ["$$item._id", "$itemId"] },
            },
          },
        },
      },
      { $unwind: { path: "$specificItem", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "services",
          localField: "specificItem.serviceId",
          foreignField: "_id",
          as: "serviceInfo",
        },
      },
      { $unwind: { path: "$serviceInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servicemasters",
          localField: "serviceInfo.serviceType",
          foreignField: "_id",
          as: "serviceTypeInfo",
        },
      },
      { $unwind: { path: "$serviceTypeInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          brandName: "$brandInfo.userName",
          brandProfileImage: "$brandInfo.profile_image.url",
          serviceName: "$serviceTypeInfo.title",
          rating: 1,
          comment: 1,
          date: "$createdAt",
        },
      },
      { $sort: { date: -1 } },
    ]);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Creator reviews retrieved successfully.",
      data: {
        averageRating,
        reviews,
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

exports.editReview = async (brandId, reviewId, rating, comment) => {
  try {
    // 1. Find and update the review (ensuring it belongs to the brand)
    const review = await Review.findOneAndUpdate(
      { _id: reviewId, brandId },
      { $set: { rating: Number(rating), comment: comment || "" } },
      { new: true }
    );

    if (!review) {
      throw new Error("Review not found or unauthorized.");
    }

    // 2. Recalculate creator's global average rating
    await this.updateCreatorAverageRating(review.creatorId);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Review updated successfully.",
      data: review,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteReview = async (brandId, reviewId) => {
  try {
    // 1. Find the review first to get creatorId
    const review = await Review.findOne({ _id: reviewId, brandId });
    if (!review) {
      throw new Error("Review not found or unauthorized.");
    }

    const creatorId = review.creatorId;

    // 2. Delete the review
    await Review.deleteOne({ _id: reviewId });

    // 3. Recalculate creator's global average rating
    await this.updateCreatorAverageRating(creatorId);

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Review deleted successfully.",
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
