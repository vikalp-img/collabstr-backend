const express = require("express");
const router = express.Router();

const controller = require("../controllers/transactionController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");

// Protected
router.use(adminAuth);

router.get("/", responseHandler(controller.getAllTransactions));
router.get("/:id", responseHandler(controller.getTransactionDetails));


module.exports = router;