const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/orderController");
const upload = require("../../middleware/multer");


router.use(auth);

router.post("/place", responseHandler(controllers.placeOrder));
router.patch("/status", responseHandler(controllers.updateOrderItemStatus));
router.post("/escrow/refund", responseHandler(controllers.refundEscrow));
router.post("/deliver", responseHandler(controllers.deliverOrderItem));
router.post("/review", responseHandler(controllers.reviewDelivery));
router.get("/list", responseHandler(controllers.getOrders));
router.get("/:id", responseHandler(controllers.getOrderById));


module.exports = router;