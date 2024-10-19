const { Sequelize } = require("sequelize");

const db = new Sequelize("doctor", "root", "", {
  host: "localhost",
  port: 3000,
  dialect: "mysql",
});

async function connection() {
  await db
    .authenticate()
    .then(() => {
      console.log("Database connected successfully.");
    })
    .catch((err) => {
      console.error("Unable to connect to the database:", err);
    });
}
connection();
module.exports = { db };
