const express = require("express");
const router = express.Router();

const controller = require("../controllers/brandController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");


// Protected
router.use(adminAuth);

router.get("/", responseHandler(controller.getAllBrands));
router.get("/:id", responseHandler(controller.getBrandDetails));
router.patch("/block/:id", responseHandler(controller.blockUnblockBrand));


module.exports = router;