const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("./auth");
require("dotenv").config();
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// 1. Buat folder 'uploads' bisa diakses oleh publik (Frontend)
app.use("/uploads", express.static("uploads"));

// 2. Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Simpan ke folder uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// TAMBAHAN BARU: Filter khusus agar HANYA menerima PDF
const filterPDF = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true); // File diizinkan
  } else {
    cb(new Error("Hanya file berformat PDF yang diizinkan!"), false); // File ditolak
  }
};

// Masukkan filterPDF ke dalam multer
const upload = multer({ storage: storage, fileFilter: filterPDF });

app.get("/", (req, res) => {
  res.send("Server Portal Lowongan Kerja API berjalan dengan baik!");
});

// Endpoint untuk MELIHAT daftar lowongan kerja
// Endpoint untuk MELIHAT daftar lowongan kerja (DENGAN FITUR PENCARIAN)
app.get("/api/jobs", async (req, res) => {
  try {
    const { search } = req.query; // Menangkap kata kunci dari URL

    if (search) {
      // Jika ada pencarian, cari di kolom title, company, ATAU location
      const result = await pool.query(
        `SELECT * FROM jobs 
                 WHERE title ILIKE $1 OR company ILIKE $1 OR location ILIKE $1 
                 ORDER BY created_at DESC`,
        [`%${search}%`],
      );
      res.json(result.rows);
    } else {
      // Jika tidak ada pencarian, tampilkan semua
      const result = await pool.query(
        "SELECT * FROM jobs ORDER BY created_at DESC",
      );
      res.json(result.rows);
    }
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

// 1. Pelamar Melamar Pekerjaan (DIPERBARUI DENGAN CV)
app.post("/api/applications", auth, async (req, res) => {
  try {
    if (req.user.role !== "pelamar") {
      return res
        .status(403)
        .json({ message: "Hanya akun pelamar yang bisa melamar pekerjaan!" });
    }

    const { job_id, cv_link } = req.body; // Menangkap cv_link dari React

    const cekLamaran = await pool.query(
      "SELECT * FROM applications WHERE user_id = $1 AND job_id = $2",
      [req.user.id, job_id],
    );
    if (cekLamaran.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Anda sudah melamar untuk posisi ini!" });
    }

    // Memasukkan data lamaran beserta link CV ke database
    await pool.query(
      "INSERT INTO applications (user_id, job_id, cv_link) VALUES ($1, $2, $3)",
      [req.user.id, job_id, cv_link],
    );
    res.json({ message: "Berhasil melamar pekerjaan!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 2. Perusahaan Melihat Daftar Pelamar
// 2. Perusahaan Melihat Daftar Pelamar (DIPERBARUI DENGAN CV)
app.get("/api/applications", auth, async (req, res) => {
  try {
    if (req.user.role !== "perusahaan") {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    // Tambahkan a.cv_link pada baris SELECT
    const result = await pool.query(`
            SELECT a.id, u.name AS applicant_name, u.email, j.title AS job_title, a.status, a.cv_link, a.created_at
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

// 3. Perusahaan Mengubah Status Lamaran (Terima / Tolak / Interview)
app.put("/api/applications/:id", auth, async (req, res) => {
  try {
    // Hanya HRD perusahaan yang boleh mengubah status
    if (req.user.role !== "perusahaan") {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    const { id } = req.params; // Mengambil ID lamaran dari URL
    const { status } = req.body; // Mengambil status baru dari frontend

    // Update data di database PostgreSQL
    const updateLamaran = await pool.query(
      "UPDATE applications SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (updateLamaran.rows.length === 0) {
      return res.status(404).json({ message: "Data lamaran tidak ditemukan!" });
    }

    res.json({
      message: "Status lamaran berhasil diperbarui!",
      data: updateLamaran.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// ENDPOINT PROFIL USER
// ==========================================

// 1. Ambil Data Profil Pengguna yang Sedang Login
app.get("/api/profile", auth, async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT id, name, email, role, phone, address, education, experience, skills, bio, cv_link, 
             birth_place, birth_date, gender, marital_status, height, weight 
             FROM users WHERE id = $1`,
      [req.user.id],
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 2. Perbarui Data Profil Pengguna (Super Lengkap)
app.put("/api/profile", auth, upload.single("cv_file"), async (req, res) => {
  try {
    const {
      phone,
      address,
      education,
      experience,
      skills,
      bio,
      birth_place,
      birth_date,
      gender,
      marital_status,
      height,
      weight,
    } = req.body;

    let cv_link = req.body.cv_link;
    if (req.file) {
      cv_link = "/uploads/" + req.file.filename;
    }

    const updatedProfile = await pool.query(
      `UPDATE users 
             SET phone = $1, address = $2, education = $3, experience = $4, skills = $5, bio = $6, 
                 cv_link = $7, birth_place = $8, birth_date = $9, gender = $10, marital_status = $11, 
                 height = $12, weight = $13
             WHERE id = $14 
             RETURNING *`,
      [
        phone,
        address,
        education,
        experience,
        skills,
        bio,
        cv_link,
        birth_place,
        birth_date,
        gender,
        marital_status,
        height,
        weight,
        req.user.id,
      ],
    );

    res.json({
      message: "Profil berhasil diperbarui!",
      data: updatedProfile.rows[0],
    });
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
