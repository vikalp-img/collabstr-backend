const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/creatorController");


// Protected
router.use(adminAuth);

// Creators
router.get("/", responseHandler(controllers.getAllCreators));
router.get("/:id", responseHandler(controllers.getCreatorDetails));
router.patch("/:id/block", responseHandler(controllers.blockUnblockCreator));
router.patch("/:id/approve", responseHandler(controllers.approveRejectCreator));
router.patch("/:id/featured", responseHandler(controllers.toggleFeaturedCreator));


module.exports = router;