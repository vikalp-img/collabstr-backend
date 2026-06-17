const express = require("express");
const router = express.Router();
const cmsController = require("../controllers/cmsController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");

// Protected
router.use(adminAuth);

router.get("/", responseHandler(cmsController.getCmsContent));
router.post("/", responseHandler(cmsController.addCmsContent));
router.put("/:id", responseHandler(cmsController.updateCmsContent));
router.delete("/:id", responseHandler(cmsController.deleteCmsContent));

module.exports = router;
