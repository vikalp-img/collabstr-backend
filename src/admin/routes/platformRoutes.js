const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/platformController");


// Protedted
router.use(adminAuth);

router.post("/", responseHandler(controllers.createPlatform));
router.get("/", responseHandler(controllers.getPlatforms));
router.put("/:id", responseHandler(controllers.updatePlatform));
router.delete("/:id", responseHandler(controllers.deletePlatform));


module.exports = router;