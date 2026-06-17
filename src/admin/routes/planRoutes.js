const express = require("express");
const router = express.Router();
const planController = require("../controllers/planController");
const responseHandler = require("../../helpers/responseHandler");
const adminAuth = require("../../middleware/adminAuth");

// Protected
router.use(adminAuth);

router.post("/", responseHandler(planController.createPlan));
router.get("/", responseHandler(planController.getPlans));
router.get("/:id", responseHandler(planController.getPlanById));
router.put("/:id", responseHandler(planController.updatePlan));
router.delete("/:id", responseHandler(planController.deletePlan));

module.exports = router;