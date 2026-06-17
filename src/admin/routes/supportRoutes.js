const express = require("express");
const router = express.Router();
const controller = require("../controllers/supportController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");

// Protected Admin Routes
router.use(adminAuth);

router.get("/", responseHandler(controller.getAllRequests));
router.get("/:id", responseHandler(controller.getRequestById));
router.patch("/:id", responseHandler(controller.updateStatus));

module.exports = router;
