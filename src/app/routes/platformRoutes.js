const express = require("express");
const router = express.Router();

const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/platformController");

// Public
router.get("/", responseHandler(controllers.getPlatforms));


module.exports = router;