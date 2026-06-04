const pool = require("./db");

const updateUsersTable = async () => {
  try {
    console.log("Sedang menambahkan kolom profil ke tabel users...");
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
    );
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_link TEXT");
    console.log(
      "SUKSES: Kolom profil (phone, skills, bio, cv_link) berhasil ditambahkan!",
    );
  } catch (err) {
    console.error("GAGAL:", err.message);
  } finally {
    pool.end();
  }
};

updateUsersTable();
