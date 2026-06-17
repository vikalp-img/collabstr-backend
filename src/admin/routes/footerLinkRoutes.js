const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/footerLinkController");

// Protected
router.use(adminAuth);

router.get("/list", responseHandler(controllers.getFooterLinks));
router.put("/upsert", responseHandler(controllers.upsertFooterLinks));
router.patch("/toggle-status", responseHandler(controllers.toggleFooterLinkStatus));

module.exports = router;
