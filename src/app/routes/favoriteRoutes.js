const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/favoriteController");


// Protected
router.use(auth);

// List management
router.post("/lists", responseHandler(controllers.createList));
router.get("/lists", responseHandler(controllers.getLists));
router.patch("/lists/:listId", responseHandler(controllers.updateList));
router.delete("/lists/:listId", responseHandler(controllers.deleteList));

// Favorite creator management
router.post("/add", responseHandler(controllers.addCreatorToList));
router.post("/remove", responseHandler(controllers.removeCreatorFromList)); // Using POST for remove as it might need multiple IDs
router.get("/in-list/:listId", responseHandler(controllers.getCreatorsInList));
router.get("/all-creators", responseHandler(controllers.getAllFavoriteCreators));

module.exports = router;
