const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/platformWalletController");


// protected
router.use(adminAuth);

router.get("/", responseHandler(controllers.getPlatformWallet));
router.get("/transactions", responseHandler(controllers.getPlatformTransactions));
router.post("/deposit", responseHandler(controllers.deposit));
router.post("/user-deposit", responseHandler(controllers.depositToUserWallet));


module.exports = router;