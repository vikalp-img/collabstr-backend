const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");
const upload = require("../../middleware/multer");


// Protected
router.use(adminAuth);

router.get("/", responseHandler(blogController.getAllBlogs));
router.get("/:id", responseHandler(blogController.getBlogById));
router.post("/", upload.single("blog_image"), responseHandler(blogController.createBlog));
router.put("/:id", upload.single("blog_image"), responseHandler(blogController.updateBlog)); 
router.delete("/:id", responseHandler(blogController.deleteBlog));


module.exports = router;