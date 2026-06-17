const express = require("express");
const router = express.Router();
const controller = require("../controllers/leadController");
const responseHandler = require("../../helpers/responseHandler");

// Public
router.post("/subscribe", responseHandler(controller.subscribe));
router.post("/unsubscribe", responseHandler(controller.unsubscribe));

module.exports = router;
