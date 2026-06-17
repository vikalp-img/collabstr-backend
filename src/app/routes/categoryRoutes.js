const express = require("express");
const router = express.Router();

const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/categoryController");


// Public
router.get("/", responseHandler(controllers.getCategories));


module.exports = router;