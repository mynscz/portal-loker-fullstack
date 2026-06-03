const pool = require("./db");

const createTableAndInsertData = async () => {
  try {
    // 1. Membuat tabel users (Kode Anda sebelumnya)
    await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL, role VARCHAR(20) CHECK (role IN ('pelamar', 'perusahaan')) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // 2. Membuat tabel jobs (Kode Anda sebelumnya)
    await pool.query(`
            CREATE TABLE IF NOT EXISTS jobs (
                id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL, company VARCHAR(100) NOT NULL,
                location VARCHAR(100) NOT NULL, type VARCHAR(50) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // 3. (BARU) Membuat tabel applications (Lamaran)
    await pool.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                job_id INTEGER REFERENCES jobs(id),
                status VARCHAR(50) DEFAULT 'Menunggu Review',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    console.log("Semua tabel (users, jobs, applications) berhasil dibuat!");
  } catch (err) {
    console.error("Terjadi kesalahan:", err.message);
  } finally {
    pool.end(); // Menutup koneksi setelah selesai
  }
};

createTableAndInsertData();
