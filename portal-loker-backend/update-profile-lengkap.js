const pool = require("./db");

const updateUsersTable = async () => {
  try {
    console.log("Menambahkan kolom alamat, pendidikan, dan pengalaman...");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT");
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS education VARCHAR(100)",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS experience TEXT",
    );
    console.log("SUKSES: Kolom profil lengkap berhasil ditambahkan!");
  } catch (err) {
    console.error("GAGAL:", err.message);
  } finally {
    pool.end();
  }
};

updateUsersTable();
