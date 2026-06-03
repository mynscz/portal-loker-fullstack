const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect((err) => {
  if (err) {
    console.error("Koneksi database gagal:", err.stack);
  } else {
    console.log("Berhasil terhubung ke database PostgreSQL!");
  }
});

module.exports = pool;
