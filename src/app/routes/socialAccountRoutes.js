const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/socialAccountController");

// Protected
router.use(auth);

router.post("/", responseHandler(controllers.addSocialAccount));
router.get("/", responseHandler(controllers.getSocialAccounts));
router.put("/:id", responseHandler(controllers.updateSocialAccount));
router.delete("/:id", responseHandler(controllers.removeSocialAccount));


module.exports = router;