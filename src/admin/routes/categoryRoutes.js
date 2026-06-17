const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const categoryController = require("../controllers/categoryController");
const upload = require("../../middleware/multer");


// Protected
router.use(adminAuth);

router.post("/", upload.single('icon'), responseHandler(categoryController.createCategory));
router.get("/", responseHandler(categoryController.getAllCategories));
router.put("/:id", upload.single('icon'), responseHandler(categoryController.updateCategory));
router.delete("/:id", responseHandler(categoryController.deleteCategory));


module.exports = router;