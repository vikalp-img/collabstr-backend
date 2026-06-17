const express = require("express");
const router = express.Router();
const auth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/subscriptionController");

// Admin Protected
router.use(auth);

// Get all subscriptions with filtering
router.get("/all", responseHandler(controllers.getAllSubscriptions));

// Get all subscriptions for a specific brand
router.get("/brand/:brandId", responseHandler(controllers.getSubscriptionsByBrand));

// Cancel a subscription (Admin action)
router.patch("/cancel/:id", responseHandler(controllers.cancelSubscription));

module.exports = router;
