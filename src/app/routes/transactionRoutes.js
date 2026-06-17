const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/transactionController");


// Protected
router.use(auth);

router.get("/", responseHandler(controllers.getTransactions));
router.get("/:id", responseHandler(controllers.getTransactionDetails));


module.exports = router;