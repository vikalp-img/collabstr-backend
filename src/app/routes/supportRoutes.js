const express = require("express");
const router = express.Router();
const controller = require("../controllers/supportController");
const responseHandler = require("../../helpers/responseHandler");

// Public support submission route
router.post("/", responseHandler(controller.submitRequest));

module.exports = router;
