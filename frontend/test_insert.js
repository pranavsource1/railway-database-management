const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "railway_system",
  });
  try {
    await pool.query(
      "INSERT INTO ticket (pnr, date_of_travel, boarding_station, destination_station, train_no, username, class_id) VALUES (5122543299, '2025-04-15', 1, 3, 18046, 'thr_user1', '2AC')",
    );
    console.log("SUCCESS");
  } catch (e) {
    console.error("ERROR:", e.message);
  }
  process.exit();
}
run();
