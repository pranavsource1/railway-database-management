const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "railway_system",
    multipleStatements: true,
  });
  try {
    const sql = fs.readFileSync("more_demo_data.sql", "utf8");
    await pool.query(sql);
    console.log("SUCCESS");
  } catch (e) {
    console.error("ERROR:", e.message);
  }
  process.exit();
}
run();
