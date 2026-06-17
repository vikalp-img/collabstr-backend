const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/serviceController");


// Public
router.get("/all", responseHandler(controllers.getAllServices));
router.get("/:platformId", responseHandler(controllers.getServiceTypesByPlatform));

// Protected
router.use(auth);

router.post("/", responseHandler(controllers.createService));
router.get("/", responseHandler(controllers.getServices));
router.put("/:id", responseHandler(controllers.updateService));
router.delete("/:id", responseHandler(controllers.deleteService));


module.exports = router;