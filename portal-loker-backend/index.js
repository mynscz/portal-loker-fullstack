const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("./auth");
require("dotenv").config();
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Portal Lowongan Kerja API berjalan dengan baik!");
});

// Endpoint untuk MELIHAT daftar lowongan kerja
app.get("/api/jobs", async (req, res) => {
  try {
    // Mengambil semua data dari tabel jobs dan mengurutkannya dari yang terbaru
    const result = await pool.query(
      "SELECT * FROM jobs ORDER BY created_at DESC",
    );

    // Mengirimkan hasil query ke frontend
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.post("/api/jobs", auth, async (req, res) => {
  try {
    // Cek apakah tiket yang digunakan adalah milik perusahaan
    if (req.user.role !== "perusahaan") {
      return res.status(403).json({
        message:
          "Akses ditolak! Hanya akun perusahaan yang bisa memposting lowongan.",
      });
    }

    // Jika lolos, ambil data lowongan yang diketik
    const { title, company, location, type } = req.body;

    // Masukkan ke database
    const newJob = await pool.query(
      "INSERT INTO jobs (title, company, location, type) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, company, location, type],
    );

    res.json({ message: "Lowongan berhasil dibuat!", job: newJob.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// ENDPOINT LAMARAN (APPLICATIONS)
// ==========================================

// 1. Pelamar Melamar Pekerjaan
app.post("/api/applications", auth, async (req, res) => {
  try {
    if (req.user.role !== "pelamar") {
      return res
        .status(403)
        .json({ message: "Hanya akun pelamar yang bisa melamar pekerjaan!" });
    }

    const { job_id } = req.body;

    // Cek apakah user sudah melamar posisi ini sebelumnya
    const cekLamaran = await pool.query(
      "SELECT * FROM applications WHERE user_id = $1 AND job_id = $2",
      [req.user.id, job_id],
    );
    if (cekLamaran.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Anda sudah melamar untuk posisi ini!" });
    }

    // Masukkan data lamaran ke database
    await pool.query(
      "INSERT INTO applications (user_id, job_id) VALUES ($1, $2)",
      [req.user.id, job_id],
    );
    res.json({ message: "Berhasil melamar pekerjaan!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 2. Perusahaan Melihat Daftar Pelamar
app.get("/api/applications", auth, async (req, res) => {
  try {
    if (req.user.role !== "perusahaan") {
      return res
        .status(403)
        .json({
          message:
            "Akses ditolak! Hanya perusahaan yang bisa melihat data pelamar.",
        });
    }

    // Menggabungkan (JOIN) tabel lamaran, user, dan lowongan agar HRD bisa melihat nama dan posisinya
    const result = await pool.query(`
            SELECT a.id, u.name AS applicant_name, u.email, j.title AS job_title, a.status, a.created_at
            FROM applications a
            JOIN users u ON a.user_id = u.id
            JOIN jobs j ON a.job_id = j.id
            ORDER BY a.created_at DESC
        `);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

// 1. Register (Mendaftar Akun Baru)
app.post("/api/auth/register", async (req, res) => {
  try {
    // Menangkap data yang dikirim dari klien
    const { name, email, password, role } = req.body;

    // Mengecek apakah email sudah terdaftar
    const userExist = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    // Mengacak (hash) password sebelum disimpan
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Menyimpan user baru ke database
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, hashedPassword, role],
    );

    res.json({ message: "Registrasi berhasil!", user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 2. Login (Masuk Akun)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Mengecek apakah user ada di database
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Email atau password salah!" });
    }

    // Mencocokkan password yang diketik dengan password yang diacak di database
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email atau password salah!" });
    }

    // Membuat tiket/token JWT
    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }, // Token akan hangus dalam 1 jam
    );

    res.json({ message: "Login berhasil!", token: token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
