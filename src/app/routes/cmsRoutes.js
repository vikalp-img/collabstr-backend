const express = require("express");
const router = express.Router();
const controllers = require("../controllers/cmsController");
const responseHandler = require("../../helpers/responseHandler");

// Public
router.get("/", responseHandler(controllers.getCmsContent));

module.exports = router;
