const express = require("express");
const router = express.Router();
const controller = require("../controllers/leadController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");

// Protected
router.use(adminAuth);

router.get("/", responseHandler(controller.getAllLeads));
router.get("/:id", responseHandler(controller.getLeadById));
router.patch("/:id", responseHandler(controller.updateLead));
router.delete("/:id", responseHandler(controller.deleteLead));

module.exports = router;
