const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/serviceTypeController");


// Protected
router.use(adminAuth);

router.post("/", responseHandler(controllers.createServiceType));
router.get("/", responseHandler(controllers.getServiceTypes));
router.put("/:id", responseHandler(controllers.updateServiceType));
router.delete("/:id", responseHandler(controllers.deleteServiceType));


module.exports = router;