const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/testimonialController");
const upload = require("../../middleware/multer");

// Protected
router.use(adminAuth);

router.get("/list", responseHandler(controllers.getTestimonials));
router.post("/add", upload.single('userImage'), responseHandler(controllers.addTestimonial));
router.put("/update/:id", upload.single('userImage'), responseHandler(controllers.updateTestimonial));
router.delete("/delete/:id", responseHandler(controllers.deleteTestimonial));


module.exports = router;