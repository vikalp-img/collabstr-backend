const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/cartController");


router.use(auth);

router.get("/", responseHandler(controllers.getCart));
router.post("/", responseHandler(controllers.addToCart));
router.delete("/clear", responseHandler(controllers.clearCart));
router.patch("/:id", responseHandler(controllers.updateQuantity));
router.delete("/:id", responseHandler(controllers.removeFromCart));


module.exports = router;