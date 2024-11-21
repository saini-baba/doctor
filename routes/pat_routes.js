const express = require("express");
const router = express.Router();
const controler = require("../controller/controller.js");
const middleware = require("../middleware/middleware.js");


router.get("/doc-data/:date", middleware.auth, controler.all_doc);
router.post(
  "/disease",
  middleware.auth,
  middleware.uploadMiddleware,
  controler.disease
);
router.get("/dis-data/:date/:status", middleware.auth, controler.all_dis);
router.delete("/delete", middleware.auth, controler.delete);
module.exports = router;
