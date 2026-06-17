const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const optionalAuth = require("../../middleware/optionalAuth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/userController");
const dashboardControllers = require("../controllers/dashboardController");
const upload = require("../../middleware/multer");


router.get("/index", async (req, res) => {
  res.send("api routes working properly ❤");
});

// Public
router.post("/login", responseHandler(controllers.login));
router.post("/register", upload.array('portfolio', 10), responseHandler(controllers.registerCreator));
router.post("/registerBrand", responseHandler(controllers.registerBrand));
router.get("/creators", optionalAuth, responseHandler(controllers.searchCreators));
router.get("/creators/:id", optionalAuth, responseHandler(controllers.getCreatorDetails));
router.post("/resendOtp", responseHandler(controllers.resendOtp));
router.post("/check-email", responseHandler(controllers.checkEmail));


// Protected
router.use(auth);

router.get("/creator/dashboard", responseHandler(dashboardControllers.getCreatorDashboard));
router.get("/creator/:id", responseHandler(controllers.getCreator));

router.patch("/editProfile", responseHandler(controllers.editProfile));
router.patch("/updateProfile", upload.single('profile_image'), responseHandler(controllers.updateProfile));
router.patch("/updateCoverImage", upload.single('cover_image'), responseHandler(controllers.updateCoverImage));
router.get("/profile", responseHandler(controllers.getProfile));
router.post("/logout", responseHandler(controllers.logout));
router.get("/portfolio", responseHandler(controllers.getPortfolioItems));
router.post("/portfolio", upload.array('media', 10), responseHandler(controllers.addPortfolioItem));
router.delete("/portfolio/:id", responseHandler(controllers.removePortfolioItem));

router.post("/requestPanKyc", responseHandler(controllers.requestPanKyc));
router.post("/requestAadhaarKyc", responseHandler(controllers.requestAadhaarKyc));
router.post("/requestBankKyc", responseHandler(controllers.requestBankKyc));

router.post("/requestEmailVerify", responseHandler(controllers.requestEmailVerify));
router.post("/verifyEmailOtp", responseHandler(controllers.verifyEmailOtp));
router.post("/requestMobileVerify", responseHandler(controllers.requestMobileVerify));
router.post("/verifyMobileOtp", responseHandler(controllers.verifyMobileOtp));
router.post("/request-approval", responseHandler(controllers.requestProfileApproval));


module.exports = router;