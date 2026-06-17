const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const responseHandler = require("../../helpers/responseHandler");
const controllers = require("../controllers/reviewController");


// Public
router.get("/creator/:creatorId", responseHandler(controllers.getCreatorReviews));

// Protected
router.use(auth);

router.post("/add", responseHandler(controllers.addReview));
router.put("/:reviewId", responseHandler(controllers.editReview));
router.delete("/:reviewId", responseHandler(controllers.deleteReview));


module.exports = router;