const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");


// Protected
router.use(adminAuth);

router.get("/stats", responseHandler(dashboardController.getDashboardStats));


module.exports = router;