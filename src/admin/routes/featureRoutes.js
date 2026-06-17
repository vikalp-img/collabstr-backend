const express = require("express");
const router = express.Router();
const featureController = require("../controllers/featureController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");

// Protected
router.use(adminAuth);

router.post("/", responseHandler(featureController.createFeature));
router.get("/", responseHandler(featureController.getFeatures));
router.get("/:id", responseHandler(featureController.getFeatureById));
router.put("/:id", responseHandler(featureController.updateFeature));
router.delete("/:id", responseHandler(featureController.deleteFeature));

module.exports = router;