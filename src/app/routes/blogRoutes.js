const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const responseHandler = require("../../helpers/responseHandler");

// Public
router.get("/", responseHandler(blogController.getBlogs));
router.get("/:id", responseHandler(blogController.getBlogDetails));

module.exports = router;
