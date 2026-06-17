const favoriteService = require("../services/favoriteService");
const { statusCode } = require("../../config/default.json");


exports.createList = async (req) => {
  try {
    const { name, description } = req.body;
    const userId = req.user._id;
    return await favoriteService.createList(userId, name, description);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getLists = async (req) => {
  try {
    const userId = req.user._id;
    return await favoriteService.getLists(userId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.updateList = async (req) => {
  try {
    const { listId } = req.params;
    const userId = req.user._id;
    return await favoriteService.updateList(userId, listId, req.body);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.deleteList = async (req) => {
  try {
    const { listId } = req.params;
    const userId = req.user._id;
    return await favoriteService.deleteList(userId, listId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

/**
 * Handle Favorite Creator Operations
 */
exports.addCreatorToList = async (req) => {
  try {
    const { creatorId, listId } = req.body;
    const userId = req.user._id;
    return await favoriteService.addCreatorToList(userId, creatorId, listId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.removeCreatorFromList = async (req) => {
  try {
    const { creatorId, listId } = req.body;
    const userId = req.user._id;
    return await favoriteService.removeCreatorFromList(userId, creatorId, listId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getCreatorsInList = async (req) => {
  try {
    const { listId } = req.params;
    const userId = req.user._id;
    return await favoriteService.getCreatorsInList(userId, listId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

exports.getAllFavoriteCreators = async (req) => {
  try {
    const userId = req.user._id;
    return await favoriteService.getAllFavoriteCreators(userId);
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};
