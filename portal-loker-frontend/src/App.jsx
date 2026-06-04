import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [view, setView] = useState("home");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userRole, setUserRole] = useState(localStorage.getItem("role") || "");

  // State profil super lengkap
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    birth_place: "",
    birth_date: "",
    gender: "",
    marital_status: "",
    height: "",
    weight: "",
    address: "",
    education: "",
    experience: "",
    skills: "",
    bio: "",
    cv_link: "",
    cv_file: null,
  });

  const fetchJobs = async (searchQuery = "") => {
    try {
      const url = searchQuery
        ? `http://localhost:5000/api/jobs?search=${searchQuery}`
        : "http://localhost:5000/api/jobs";
      const res = await fetch(url);
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error("Gagal ambil lowongan:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error("Gagal ambil data pelamar:", err);
    }
  };

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          birth_place: data.birth_place || "",
          // Memastikan format tanggal cocok dengan input type="date" (YYYY-MM-DD)
          birth_date: data.birth_date ? data.birth_date.substring(0, 10) : "",
          gender: data.gender || "",
          marital_status: data.marital_status || "",
          height: data.height || "",
          weight: data.weight || "",
          address: data.address || "",
          education: data.education || "",
          experience: data.experience || "",
          skills: data.skills || "",
          bio: data.bio || "",
          cv_link: data.cv_link || "",
          cv_file: null,
        });
      }
    } catch (err) {
      console.error("Gagal mengambil data profil:", err);
    }
  };

  useEffect(() => {
    fetchJobs();
    if (token) {
      fetchProfile();
      if (userRole === "perusahaan") {
        fetchApplications();
      }
    }
  }, [token, userRole]);

  const handleAuthChange = (e) =>
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  const handleJobChange = (e) =>
    setJobForm({ ...jobForm, [e.target.name]: e.target.value });

  const handleProfileChange = (e) => {
    if (e.target.type === "file") {
      setProfile({ ...profile, cv_file: e.target.files[0] });
    } else {
      setProfile({ ...profile, [e.target.name]: e.target.value });
    }
  };

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "pelamar",
  });
  const [authError, setAuthError] = useState("");
  const [jobForm, setJobForm] = useState({
    title: "",
    company: "PT XYZ",
    location: "",
    type: "Full-time",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert("Registrasi Berhasil! Silakan Login.");
      setView("login");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const decodedRole =
        authForm.email.includes("hrd") || authForm.email.includes("perusahaan")
          ? "perusahaan"
          : "pelamar";
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", decodedRole);
      setToken(data.token);
      setUserRole(decodedRole);
      alert("Login Berhasil!");
      setView("home");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken("");
    setUserRole("");
    setProfile({
      name: "",
      email: "",
      phone: "",
      birth_place: "",
      birth_date: "",
      gender: "",
      marital_status: "",
      height: "",
      weight: "",
      address: "",
      education: "",
      experience: "",
      skills: "",
      bio: "",
      cv_link: "",
      cv_file: null,
    });
    setView("home");
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jobForm),
      });
      if (!res.ok) throw new Error("Gagal membuat lowongan");
      alert("Lowongan Berhasil Ditambahkan!");
      await fetchJobs();
      setView("home");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApply = async (jobId) => {
    if (!token) return alert("Silakan login sebagai pelamar terlebih dahulu!");
    if (userRole === "perusahaan")
      return alert("Akun perusahaan tidak bisa melamar pekerjaan!");

    if (!profile.cv_link || profile.cv_link.trim() === "") {
      alert(
        "Profil Anda belum memiliki file CV.\nSilakan masuk ke menu 'Profil Saya' dan unggah dokumen CV Anda terlebih dahulu sebelum melamar.",
      );
      setView("profile");
      return;
    }

    const yakin = window.confirm(
      "Sistem akan otomatis melampirkan File CV dan Data Diri dari profil Anda. Lanjutkan melamar?",
    );
    if (!yakin) return;

    try {
      const res = await fetch("http://localhost:5000/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: jobId, cv_link: profile.cv_link }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(
        "Lamaran berhasil dikirim beserta File CV! HRD akan meninjau data Anda.",
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/applications/${applicationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchApplications();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportCSV = () => {
    if (applications.length === 0)
      return alert("Belum ada data untuk diekspor!");
    const headers = [
      "Nama Pelamar",
      "Email",
      "Posisi",
      "Link CV",
      "Status Saat Ini",
    ];
    const rows = applications.map((app) => [
      `"${app.applicant_name}"`,
      `"${app.email}"`,
      `"${app.job_title}"`,
      `"${app.cv_link ? (app.cv_link.startsWith("http") ? app.cv_link : `http://localhost:5000${app.cv_link}`) : "Tidak ada dokumen"}"`,
      `"${app.status}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Rekap_Laporan_Rekrutmen.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("phone", profile.phone);
      formData.append("birth_place", profile.birth_place);
      formData.append("birth_date", profile.birth_date);
      formData.append("gender", profile.gender);
      formData.append("marital_status", profile.marital_status);
      formData.append("height", profile.height);
      formData.append("weight", profile.weight);
      formData.append("address", profile.address);
      formData.append("education", profile.education);
      formData.append("experience", profile.experience);
      formData.append("skills", profile.skills);
      formData.append("bio", profile.bio);

      if (profile.cv_file) {
        formData.append("cv_file", profile.cv_file);
      } else {
        formData.append("cv_link", profile.cv_link || "");
      }

      const res = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setProfile({ ...profile, cv_link: data.data.cv_link, cv_file: null });
      alert("Profil dan File CV Anda berhasil disimpan!");
      setView("home");
    } catch (err) {
      alert(err.message);
    }
  };

  // Fungsi khusus untuk tombol Eksplor Lowongan di Navbar
  const handleExploreJobs = () => {
    if (view !== "home") {
      setView("home");
      // Beri jeda 100 milidetik agar React selesai me-render Beranda dulu, lalu gulir ke bawah
      setTimeout(() => {
        document
          .getElementById("job-board")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      // Jika sudah di Beranda, langsung gulir ke bawah dengan mulus
      document
        .getElementById("job-board")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container">
      <nav className="navbar">
        <div
          className="nav-brand"
          onClick={() => {
            setView("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          IndustriConnect
        </div>
        <div className="nav-links">
          <button onClick={handleExploreJobs}>Eksplor</button>

          {token && userRole === "pelamar" && (
            <button onClick={() => setView("profile")}>Profil Saya</button>
          )}

          {token && userRole === "perusahaan" && (
            <>
              <button onClick={() => setView("applications")}>
                Lihat Lamaran
              </button>
              <button onClick={() => setView("add-job")} className="btn-accent">
                Tambah Lowongan
              </button>
            </>
          )}

          {!token ? (
            <>
              <button onClick={() => setView("login")}>Login</button>
              <button onClick={() => setView("register")}>Daftar</button>
            </>
          ) : (
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* BERANDA / LANDING PAGE */}
      {view === "home" && (
        <div className="landing-page-wrapper">
          {/* 1. HERO SECTION (Wajah Utama) */}
          <header className="hero-section">
            <div className="hero-badge">
              🚀 Platform Rekrutmen #1 di Kawasan Industri
            </div>
            <h1>
              Wujudkan Karier Impianmu di <br />
              <span className="text-gradient">Dunia Manufaktur</span>
            </h1>
            <p className="hero-subtitle">
              Tinggalkan cara lama. Buat profil digitalmu, unggah CV satu kali,
              dan lamar ke berbagai posisi di pabrik terkemuka hanya dengan satu
              klik.
            </p>
            <div className="hero-buttons">
              <button
                className="btn-accent btn-large"
                onClick={() =>
                  document
                    .getElementById("job-board")
                    .scrollIntoView({ behavior: "smooth" })
                }
              >
                Mulai Eksplorasi
              </button>
              {!token && (
                <button
                  className="btn-outline btn-large"
                  onClick={() => setView("register")}
                >
                  Daftar Sekarang
                </button>
              )}
            </div>
          </header>

          {/* 2. FITUR UNGGULAN (Mengapa pilih portal ini?) */}
          <section className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Bebas Kertas</h3>
              <p>
                Tidak perlu lagi fotokopi berkas tebal. Profil dan PDF-mu
                tersimpan aman di sistem kami.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lamar Sekali Klik</h3>
              <p>
                Temukan posisi impianmu dan kirim data langsung ke meja HRD
                tanpa perlu mengisi form berulang.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Transparan</h3>
              <p>
                Status lamaran diperbarui secara *real-time*. Ketahui apakah
                kamu diundang interview atau ditolak.
              </p>
            </div>
          </section>

          {/* 3. PAPAN LOWONGAN (Search & List) */}
          <div id="job-board" className="job-board-section">
            <h2 className="section-title">Lowongan Terbaru Minggu Ini</h2>

            <div className="search-container">
              <input
                type="text"
                placeholder="Cari posisi (ex: Operator CNC), nama PT, atau sektor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && fetchJobs(searchTerm)}
              />
              <button
                onClick={() => fetchJobs(searchTerm)}
                className="btn-accent"
              >
                Cari Lowongan
              </button>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    fetchJobs("");
                  }}
                  className="btn-clear"
                >
                  Reset
                </button>
              )}
            </div>

            <main className="job-list">
              {jobs.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    width: "100%",
                    padding: "40px 0",
                    color: "#64748b",
                  }}
                >
                  Belum ada lowongan yang dipublikasikan saat ini.
                </p>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <h2>{job.title}</h2>
                    <div className="job-details">
                      <p>
                        🏢 <strong>{job.company}</strong>
                      </p>
                      <p>📍 {job.location}</p>
                      <p>⏱️ {job.type}</p>
                    </div>
                    <button
                      className="apply-btn"
                      onClick={() => handleApply(job.id)}
                    >
                      Lamar Sekarang
                    </button>
                  </div>
                ))
              )}
            </main>
          </div>
        </div>
      )}

      {/* HALAMAN PROFIL SAYA (SUPER LENGKAP) */}
      {view === "profile" && (
        <div className="auth-box">
          <h2>Kelola Data Diri & CV</h2>
          <form onSubmit={handleSaveProfile}>
            {/* IDENTITAS TERKUNCI */}
            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Nama Lengkap
            </label>
            <input
              type="text"
              name="name"
              value={profile.name}
              disabled
              style={{
                backgroundColor: "#e2e8f0",
                color: "#64748b",
                cursor: "not-allowed",
              }}
            />

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Alamat Email
            </label>
            <input
              type="email"
              name="email"
              value={profile.email}
              disabled
              style={{
                backgroundColor: "#e2e8f0",
                color: "#64748b",
                cursor: "not-allowed",
              }}
            />

            {/* DATA DEMOGRAFI FISIK & KONTAK */}
            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              name="phone"
              placeholder="Contoh: 0813xxxxxxxx"
              value={profile.phone}
              onChange={handleProfileChange}
              required
            />

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Tempat Lahir
            </label>
            <input
              type="text"
              name="birth_place"
              placeholder="Contoh: Karawang"
              value={profile.birth_place}
              onChange={handleProfileChange}
              required
            />

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Tanggal Lahir
            </label>
            <input
              type="date"
              name="birth_date"
              value={profile.birth_date}
              onChange={handleProfileChange}
              required
            />

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Jenis Kelamin
            </label>
            <select
              name="gender"
              value={profile.gender}
              onChange={handleProfileChange}
              required
            >
              <option value="" disabled>
                -- Pilih Jenis Kelamin --
              </option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Status Pernikahan
            </label>
            <select
              name="marital_status"
              value={profile.marital_status}
              onChange={handleProfileChange}
              required
            >
              <option value="" disabled>
                -- Pilih Status --
              </option>
              <option value="Belum Kawin">Belum Kawin</option>
              <option value="Kawin">Kawin</option>
              <option value="Cerai Hidup / Mati">Cerai Hidup / Mati</option>
            </select>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    color: "var(--text-heading)",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  Tinggi Badan (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  placeholder="165"
                  value={profile.height}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    color: "var(--text-heading)",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  Berat Badan (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  placeholder="55"
                  value={profile.weight}
                  onChange={handleProfileChange}
                  required
                />
              </div>
            </div>

            {/* DATA ADMINISTRASI, PENDIDIKAN & KEAHLIAN */}
            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Alamat Domisili Lengkap
            </label>
            <textarea
              name="address"
              placeholder="Contoh: Jl. Raya Telukjambe..."
              value={profile.address}
              onChange={handleProfileChange}
              required
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "2px solid transparent",
                fontFamily: "var(--font-main)",
                resize: "vertical",
                minHeight: "80px",
              }}
            />

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Pendidikan Terakhir
            </label>
            <select
              name="education"
              value={profile.education}
              onChange={handleProfileChange}
              required
            >
              <option value="" disabled>
                -- Pilih Tingkat Pendidikan --
              </option>
              <option value="SMA / SMK Sederajat">SMA / SMK Sederajat</option>
              <option value="Diploma (D1 - D3)">Diploma (D1 - D3)</option>
              <option value="Sarjana (S1 / D4)">Sarjana (S1 / D4)</option>
              <option value="Magister (S2)">Magister (S2)</option>
            </select>

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Keahlian Utama
            </label>
            <input
              type="text"
              name="skills"
              list="skills-suggestions"
              placeholder="Ketik keahlian Anda atau pilih dari daftar..."
              value={profile.skills}
              onChange={handleProfileChange}
              required
            />
            <datalist id="skills-suggestions">
              <option value="Operator Produksi" />
              <option value="Operator Packing" />
              <option value="Operator Assembling" />
              <option value="Operator Injection Molding" />
              <option value="Operator CNC / Machining" />
              <option value="Operator Forklift / Material Handling" />
              <option value="Teknisi Maintenance Mesin" />
              <option value="Teknisi Kelistrikan (Elektro)" />
              <option value="Drafter (AutoCAD / SolidWorks)" />
              <option value="Mekanik Industri & Otomotif" />
              <option value="Quality Control (QC)" />
              <option value="Quality Assurance (QA)" />
              <option value="Staff Gudang / Warehouse" />
              <option value="PPIC (Production Planning)" />
              <option value="Purchasing / Pengadaan Barang" />
              <option value="Accounting & Finance" />
              <option value="Cost Accounting / Akuntansi Biaya" />
              <option value="Administrasi Produksi & Data Entry" />
              <option value="Staff HSE (Kesehatan & Keselamatan Kerja)" />
              <option value="Staff HRD / Personalia" />
              <option value="Web Developer (Laravel / React)" />
              <option value="IT Support & Jaringan Pabrik" />
              <option value="Database Administrator" />
              <option value="Data Science & Clustering Analysis" />
              <option value="Machine Learning / Object Detection" />
            </datalist>

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Pengalaman Kerja
            </label>
            <textarea
              name="experience"
              placeholder="Contoh: Internship sebagai Operator Packing di PT XYZ (Jan 2026 - Apr 2026)..."
              value={profile.experience}
              onChange={handleProfileChange}
              required
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "2px solid transparent",
                fontFamily: "var(--font-main)",
                resize: "vertical",
                minHeight: "100px",
              }}
            />

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Tentang Saya / Bio Singkat
            </label>
            <input
              type="text"
              name="bio"
              placeholder="Tulis deskripsi singkat diri Anda"
              value={profile.bio}
              onChange={handleProfileChange}
              required
            />

            <label
              style={{
                color: "var(--text-heading)",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Unggah Dokumen CV (Wajib PDF)
            </label>
            <input
              type="file"
              name="cv_file"
              accept=".pdf"
              onChange={handleProfileChange}
              style={{
                padding: "12px",
                backgroundColor: "#ffffff",
                border: "2px solid transparent",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-body)",
              }}
            />

            {profile.cv_link && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "16px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "0.9rem",
                    color: "#166534",
                    fontWeight: "600",
                  }}
                >
                  ✓ Dokumen CV Anda sudah tersimpan di sistem.
                </p>
                <a
                  href={
                    profile.cv_link.startsWith("http")
                      ? profile.cv_link
                      : `http://localhost:5000${profile.cv_link}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    backgroundColor: "#10b981",
                    color: "#ffffff",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  📄 Lihat CV Anda Saat Ini
                </a>
              </div>
            )}

            <button type="submit" className="auth-btn">
              Simpan Profil & CV
            </button>
          </form>
        </div>
      )}

      {/* DASHBOARD HRD - LIHAT LAMARAN */}
      {view === "applications" && (
        <div className="auth-box hrd-dashboard-box">
          <div className="hrd-header">
            <h2>Daftar Pelamar Masuk</h2>
            {applications.length > 0 && (
              <button onClick={handleExportCSV} className="btn-export">
                📥 Unduh Laporan
              </button>
            )}
          </div>

          {applications.length === 0 ? (
            <p style={{ textAlign: "center" }}>Belum ada pelamar saat ini.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Pelamar</th>
                    <th>Posisi</th>
                    <th>File CV</th>
                    <th>Status Saat Ini</th>
                    <th>Aksi HRD</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td data-label="NAMA PELAMAR">
                        <strong>{app.applicant_name}</strong>
                        <br />
                        <small style={{ color: "#64748b" }}>{app.email}</small>
                      </td>
                      <td data-label="POSISI">{app.job_title}</td>
                      <td data-label="DOKUMEN CV">
                        {app.cv_link ? (
                          <a
                            href={
                              app.cv_link.startsWith("http")
                                ? app.cv_link
                                : `http://localhost:5000${app.cv_link}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#6366f1",
                              fontWeight: "700",
                              textDecoration: "underline",
                            }}
                          >
                            Unduh File
                          </a>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>-</span>
                        )}
                      </td>
                      <td data-label="STATUS">
                        <span
                          className={`status-badge ${app.status === "Ditolak" ? "status-rejected" : app.status === "Diterima" ? "status-accepted" : ""}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td data-label="TINDAKAN">
                        <div className="action-buttons">
                          <button
                            onClick={() =>
                              handleUpdateStatus(app.id, "Interview")
                            }
                            className="btn-action btn-interview"
                          >
                            Interview
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(app.id, "Diterima")
                            }
                            className="btn-action btn-accept"
                          >
                            Terima
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(app.id, "Ditolak")
                            }
                            className="btn-action btn-reject"
                          >
                            Tolak
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAMPILAN REGISTER */}
      {view === "register" && (
        <div className="auth-box">
          <h2>Mendaftar Akun Baru</h2>
          {authError && <p className="error-text">{authError}</p>}
          <form onSubmit={handleRegister}>
            <input
              type="text"
              name="name"
              placeholder="Nama Lengkap"
              onChange={handleAuthChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleAuthChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleAuthChange}
              required
            />
            <select name="role" onChange={handleAuthChange}>
              <option value="pelamar">Pelamar Kerja</option>
              <option value="perusahaan">Perusahaan (HRD)</option>
            </select>
            <button type="submit" className="auth-btn">
              Daftar Akun
            </button>
          </form>
        </div>
      )}

      {/* TAMPILAN LOGIN */}
      {view === "login" && (
        <div className="auth-box">
          <h2>Masuk ke Akun Anda</h2>
          {authError && <p className="error-text">{authError}</p>}
          <form onSubmit={handleLogin}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleAuthChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleAuthChange}
              required
            />
            <button type="submit" className="auth-btn">
              Masuk
            </button>
          </form>
        </div>
      )}

      {/* TAMPILAN TAMBAH LOWONGAN */}
      {view === "add-job" && (
        <div className="auth-box">
          <h2>Pasang Lowongan Baru</h2>
          <form onSubmit={handleCreateJob}>
            <input
              type="text"
              name="title"
              placeholder="Nama Posisi"
              onChange={handleJobChange}
              required
            />
            <input
              type="text"
              name="company"
              value={jobForm.company}
              disabled
            />
            <input
              type="text"
              name="location"
              placeholder="Lokasi Kawasan"
              onChange={handleJobChange}
              required
            />
            <select name="type" onChange={handleJobChange}>
              <option value="Full-time">Full-time</option>
              <option value="Shift">Sistem Shift</option>
              <option value="Kontrak">Kontrak</option>
            </select>
            <button type="submit" className="auth-btn">
              Publikasikan Lowongan
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
