const express = require("express");
const router = express.Router();

const adminAuth = require("../../middleware/adminAuth");
const responseHandler = require("../../helpers/responseHandler");
const upload = require("../../middleware/multer");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const controllers = require("../../admin/controllers/userController");


router.get("/index", async (req, res) => {
  res.send("admin routes working properly ❤");
});

// Public
router.post("/login", responseHandler(controllers.login));

// Protected
router.use(adminAuth);

// Auth
router.post("/logout", responseHandler(controllers.logout));
router.patch("/reset-password", responseHandler(controllers.resetPassword));

// Profile
router.get("/profile", responseHandler(controllers.getProfile));
router.put(
  "/profile",
  upload.single("profile_image"),
  multerErrorHandler,
  responseHandler(controllers.updateProfile)
);




module.exports = router;