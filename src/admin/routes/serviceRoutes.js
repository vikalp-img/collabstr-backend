const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../../admin/controllers/serviceController");


// Protected
router.use(adminAuth);

router.get("/", responseHandler(controllers.getServices));
router.patch("/:id/approval", responseHandler(controllers.updateApprovalStatus));


module.exports = router;
