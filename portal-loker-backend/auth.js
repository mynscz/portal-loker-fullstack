const jwt = require("jsonwebtoken");
require("dotenv").config();

// Ini adalah fungsi satpam kita
module.exports = function (req, res, next) {
  // 1. Coba ambil token dari bagian 'header' request
  const token = req.header("Authorization");

  // 2. Jika tamu tidak membawa tiket sama sekali
  if (!token) {
    return res
      .status(401)
      .json({ message: "Akses ditolak, token tidak ditemukan!" });
  }

  try {
    // 3. Biasanya format token dikirim dengan awalan "Bearer "
    // Kita hilangkan tulisan "Bearer " untuk mendapatkan token aslinya
    const tokenAsli = token.replace("Bearer ", "");

    // 4. Periksa keaslian token menggunakan kunci rahasia dari file .env
    const decoded = jwt.verify(tokenAsli, process.env.JWT_SECRET);

    // 5. Jika sah, simpan data tamu (id & role) ke dalam request
    req.user = decoded;

    // 6. Persilakan masuk ke proses selanjutnya
    next();
  } catch (err) {
    res
      .status(401)
      .json({
        message: "Akses ditolak, token tidak valid atau sudah kadaluarsa!",
      });
  }
};
