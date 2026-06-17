const express = require("express");
const router = express.Router();

const controller = require("../controllers/orderController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");


// Protected
router.use(adminAuth);

router.get("/", responseHandler(controller.getAllOrders));
router.get("/:id", responseHandler(controller.getOrderDetails));


module.exports = router;