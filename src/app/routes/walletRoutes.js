const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/walletController");


// Protected
router.use(auth);

router.get("/", responseHandler(controllers.getWallet));
router.post("/add", responseHandler(controllers.addFunds));
router.delete("/remove", responseHandler(controllers.removeFunds));


module.exports = router;