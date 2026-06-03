const pool = require("./db");

const updateDatabase = async () => {
  try {
    // Menambahkan kolom cv_link bertipe teks
    await pool.query("ALTER TABLE applications ADD COLUMN cv_link TEXT");
    console.log(
      "SUKSES: Kolom cv_link berhasil ditambahkan ke tabel applications!",
    );
  } catch (err) {
    // Jika error (misal kolom sudah ada), abaikan saja
    console.error("Info:", err.message);
  } finally {
    pool.end();
  }
};

updateDatabase();
