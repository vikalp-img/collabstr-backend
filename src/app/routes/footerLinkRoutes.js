const express = require("express");
const router = express.Router();

const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/footerLinkController");

// Public
router.get("/list", responseHandler(controllers.getActiveFooterLinks));

module.exports = router;
