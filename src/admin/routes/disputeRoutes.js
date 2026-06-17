const express = require("express");
const router = express.Router();

const controller = require("../controllers/disputeController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");


// Protected
router.use(adminAuth);

router.get("/", responseHandler(controller.getAllDisputes));
router.patch("/resolve/:orderId/:itemId", responseHandler(controller.resolveDispute));


module.exports = router;