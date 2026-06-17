const express = require("express");
const router = express.Router();

const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/planController");


// Public
router.get("/", responseHandler(controllers.getPlans));


module.exports = router;