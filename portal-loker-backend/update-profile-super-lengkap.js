const pool = require("./db");

const updateUsersTable = async () => {
  try {
    console.log("Menambahkan kolom profil tingkat lanjut...");
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_place VARCHAR(100)",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50)",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS height VARCHAR(10)",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS weight VARCHAR(10)",
    );
    console.log("SUKSES: Kolom berhasil ditambahkan!");
  } catch (err) {
    console.error("GAGAL:", err.message);
  } finally {
    pool.end();
  }
};

updateUsersTable();
