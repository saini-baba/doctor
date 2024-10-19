const express = require("express");
const db = require("./db/db");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const doc_routes = require("./routes/doc_routes");
const pat_routes = require("./routes/pat_routes");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
dotenv.config();
const Port = process.env.port;
app.use(express.json());
app.use("/doctor", doc_routes);
app.use("/patients", pat_routes);
app.listen(Port, () => {
  console.log("running");
});