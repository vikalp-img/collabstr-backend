const express = require("express");
const router = express.Router();

const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/testimonialController");


// Public
router.get("/list", responseHandler(controllers.getTestimonials));


module.exports = router;
