const express = require("express");
const router = express.Router();
const controller = require("../controller/controller.js");
const middleware = require("../middleware/middleware.js")
router.post("/registration", controller.reg);
router.post("/login", controller.login);
router.post("/:user_id/verify", controller.verify);
router.post("/:user_id/verify/:token", controller.confirmVerification);
router.post("/:user_id/verifyOpt", controller.verify_opt);
router.post("/verifyOtp", controller.verifyOtp);
router.get("/slot/:date/:id", middleware.user_auth, controller.slot);
router.patch("/cancel", middleware.user_auth, controller.cancel);
router.patch("/confirm", middleware.user_auth, controller.confirm);
module.exports = router;
