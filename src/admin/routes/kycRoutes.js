const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/kycController");


// Protected
router.use(adminAuth);

router.get("/", responseHandler(controllers.getKycList));
router.get("/:id", responseHandler(controllers.getKycById));
router.patch("/:id/status", responseHandler(controllers.updateKycStatus));


module.exports = router;