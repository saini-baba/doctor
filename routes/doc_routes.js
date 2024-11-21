const express = require("express");
const router = express.Router();
const controler = require("../controller/controller.js");
const middleware = require("../middleware/middleware.js");

router.get(
  "/disease/:status/:date",
  middleware.doc_auth,
  controler.get_disease
);

router.patch("/complete", middleware.doc_auth, controler.complete);


module.exports = router;
