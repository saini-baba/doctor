const express = require("express");
const router = express.Router();
const controler = require("../controller/controller.js");
const middleware = require("../middleware/middleware.js");

router.get(
  "/disease/:status/:date",
  middleware.doc_auth,
  controler.get_disease
);
router.patch("/confirm", middleware.doc_auth, controler.confirm);
router.patch("/complete", middleware.doc_auth, controler.complete);
router.get("/slot/:date", middleware.doc_auth, controler.slot);
router.patch("/cancel", middleware.doc_auth, controler.cancel);
module.exports = router;
