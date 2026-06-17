const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const brandOnly = require("../../middleware/brandOnly");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/subscriptionController");

// Protected
router.use(auth);
router.use(brandOnly);

router.post("/purchase", responseHandler(controllers.purchasePlan));
router.get("/usage", responseHandler(controllers.getUsage));
router.post("/cancel", responseHandler(controllers.cancelMySubscription));


module.exports = router;