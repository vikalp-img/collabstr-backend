const mongoose = require("mongoose");
const cartModel = require("../../models/cartModel");
const serviceModel = require("../../models/serviceModel");

const { statusCode } = require("../../config/default.json");


exports.addToCart = async (userId, userRole, serviceId, price, quantity) => {
  try {
    if (userRole !== "brand") {
      throw new Error("Only brands can add services to cart");
    }

    // Use aggregation to fetch service details with joined master and creator info
    const serviceData = await serviceModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(serviceId), approvalStatus: 1 } },
      {
        $lookup: {
          from: "servicemasters",
          localField: "serviceType",
          foreignField: "_id",
          as: "master"
        }
      },
      { $unwind: "$master" },
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
          from: "users",
          localField: "creatorId",
          foreignField: "_id",
          as: "creator"
        }
      },
      { $unwind: "$creator" },
      {
        $project: {
          serviceId: "$_id",
          title: {
            $trim: {
              input: {
                $concat: [
                  { $toString: { $ifNull: ["$quantity", 1] } },
                  " ",
                  { $ifNull: ["$platformInfo.name", ""] },
                  " ",
                  "$master.title"
                ]
              }
            }
          },
          description: "$description",
          price: "$price",
          quantity: "$quantity",
          deliveryTime: "$deliveryTime",
          creatorId: "$creatorId",
          creatorName: "$creator.userName",
          creatorImage: "$creator.profile_image.url"
        }
      }
    ]);

    if (!serviceData || serviceData.length === 0) {
      throw new Error("Service not found");
    }

    const itemToStore = serviceData[0];

    // Use brand-provided negotiated price if given, otherwise fall back to service's own price
    itemToStore.price = (price !== undefined && price !== null && !isNaN(Number(price)))
      ? Number(price)
      : Number(itemToStore.price) || 0;
    
    // quantity here represents how many times the brand is ordering this service package
    // NOT the number of deliverables inside the package (which is what itemToStore.quantity currently holds)
    itemToStore.quantity = (quantity !== undefined && !isNaN(Number(quantity)))
      ? Number(quantity)
      : 1;

    let cart = await cartModel.findOne({ userId });
    if (!cart) {
      cart = new cartModel({ userId, items: [] });
    }

    const isAlreadyInCart = cart.items.some(
      (item) => item.serviceId.toString() === serviceId.toString()
    );

    if (isAlreadyInCart) {
      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Item already in cart",
        data: cart,
      };
    }

    cart.items.push(itemToStore);

    await cart.save();
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Item added to cart"
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.removeFromCart = async (userId, serviceId) => {
  try {
    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    cart.items = cart.items.filter(
      (item) => item.serviceId.toString() !== serviceId.toString()
    );

    if (cart.items.length === 0) {
      await cartModel.deleteOne({ userId });
      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Item removed and cart deleted as it became empty",
        data: null,
      };
    }

    await cart.save();
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Item removed from cart"
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getCart = async (userId) => {
  try {
    const cart = await cartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return {
        statusCode: statusCode.OK,
        success: true,
        message: "Cart is empty",
        data: { items: [] },
      };
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      data: cart,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.clearCart = async (userId) => {
  try {
    const result = await cartModel.deleteOne({ userId });

    if (result.deletedCount === 0) {
      throw new Error("Cart not found");
    }

    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Cart removed successfully"
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateQuantity = async (userId, serviceId, newQuantity) => {
  try {
    const cart = await cartModel.findOne({ userId });
    if (!cart) throw new Error("Cart not found");

    const itemIndex = cart.items.findIndex(
      (item) => item.serviceId.toString() === serviceId.toString()
    );

    if (itemIndex === -1) {
      throw new Error("Item not found in cart");
    }

    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.items.splice(itemIndex, 1);
      
      if (cart.items.length === 0) {
        await cartModel.deleteOne({ userId });
        return {
          statusCode: statusCode.OK,
          success: true,
          message: "Item removed and cart deleted as it became empty",
          data: null,
        };
      }
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = Number(newQuantity);
    }

    await cart.save();
    return {
      statusCode: statusCode.OK,
      success: true,
      message: "Cart updated successfully",
      data: cart,
    };
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
