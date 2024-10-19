const express = require("express");
const router = express.Router();
const controler = require("../controller/controller.js");
const middleware = require("../middleware/middleware.js");
router.post("/registation", controler.reg);
router.get("/login/:email/:password", controler.login);
router.get("/doc-data/:date", middleware.auth, controler.all_doc);
router.post(
  "/disease",
  middleware.auth,
  middleware.uploadMiddleware,
  controler.disease
);
router.delete("/delete", middleware.auth, controler.delete);
module.exports = router;
