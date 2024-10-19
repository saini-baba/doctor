const express = require("express");
const router = express.Router();
const controler = require("../controller/controller.js");
const middleware = require("../middleware/middleware.js");
router.get("/data");
router.put("/update/:id");
router.post("/registation", controler.reg);
router.get("/login/:email/:password", controler.login);
router.get("/disease", middleware.doc_auth, controler.get_disease);
router.patch("/confirm",middleware.doc_auth,controler.confirm)
router.patch("/complete", middleware.doc_auth, controler.complete);

module.exports = router;
