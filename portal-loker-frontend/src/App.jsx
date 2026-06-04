import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [view, setView] = useState("home");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userRole, setUserRole] = useState(localStorage.getItem("role") || "");

  // DIPERBARUI: Tambahkan state cv_file untuk menampung file fisik
  const [profile, setProfile] = useState({
    phone: "",
    skills: "",
    bio: "",
    cv_link: "",
    cv_file: null,
  });

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
          phone: data.phone || "",
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

  // DIPERBARUI: Mendeteksi jika yang diubah adalah file
  const handleProfileChange = (e) => {
    if (e.target.type === "file") {
      setProfile({ ...profile, cv_file: e.target.files[0] });
    } else {
      setProfile({ ...profile, [e.target.name]: e.target.value });
    }
  };

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
    setProfile({ phone: "", skills: "", bio: "", cv_link: "", cv_file: null });
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

  // DIPERBARUI: Mencegah lamar kerja jika belum mengunggah file di profil
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
      "Sistem akan otomatis melampirkan File CV dari profil Anda. Lanjutkan melamar?",
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

  // DIPERBARUI: Menggunakan FormData untuk mengirim file fisik
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("phone", profile.phone);
      formData.append("skills", profile.skills);
      formData.append("bio", profile.bio);

      // Jika pengguna memilih file baru, kirim file tersebut
      if (profile.cv_file) {
        formData.append("cv_file", profile.cv_file);
      } else {
        formData.append("cv_link", profile.cv_link || "");
      }

      const res = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          // PENTING: Jangan tulis 'Content-Type' di sini, biarkan browser mengaturnya jadi multipart/form-data
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Update state dengan link file yang baru dari server
      setProfile({ ...profile, cv_link: data.data.cv_link, cv_file: null });
      alert("Profil dan File CV Anda berhasil disimpan!");
      setView("home");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container">
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setView("home")}>
          Portal Kerja
        </div>
        <div className="nav-links">
          <button onClick={() => setView("home")}>Beranda</button>

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
              Logout ({userRole})
            </button>
          )}
        </div>
      </nav>

      {/* BERANDA */}
      {view === "home" && (
        <>
          <header>
            <h1>Portal Karier Kawasan Industri</h1>
            <p>Temukan pekerjaan terbaik di perusahaan manufaktur terkemuka.</p>
          </header>
          <div className="search-container">
            <input
              type="text"
              placeholder="Cari posisi (ex: Operator), perusahaan, atau lokasi..."
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
            {jobs.map((job) => (
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
            ))}
          </main>
        </>
      )}

      {/* HALAMAN PROFIL SAYA (DIPERBARUI) */}
      {view === "profile" && (
        <div className="auth-box">
          <h2>Kelola Profil & CV</h2>
          <form onSubmit={handleSaveProfile}>
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
              Keahlian Utama
            </label>

            {/* Input teks biasa yang dihubungkan ke datalist melalui ID */}
            <input
              type="text"
              name="skills"
              list="skills-suggestions"
              placeholder="Ketik keahlian Anda atau pilih dari daftar..."
              value={profile.skills}
              onChange={handleProfileChange}
              required
            />

            {/* Datalist menyimpan daftar saran kata (suggestions) yang relevan untuk dunia industri */}
            <datalist id="skills-suggestions">
              {/* Area Produksi & Manufaktur */}
              <option value="Operator Produksi" />
              <option value="Operator Packing" />
              <option value="Operator Assembling" />
              <option value="Operator Injection Molding" />
              <option value="Operator CNC / Machining" />
              <option value="Operator Forklift / Material Handling" />

              {/* Area Engineering & Maintenance */}
              <option value="Teknisi Maintenance Mesin" />
              <option value="Teknisi Kelistrikan (Elektro)" />
              <option value="Drafter (AutoCAD / SolidWorks)" />
              <option value="Mekanik Industri & Otomotif" />

              {/* Area Kualitas, Gudang & Supply Chain */}
              <option value="Quality Control (QC)" />
              <option value="Quality Assurance (QA)" />
              <option value="Staff Gudang / Warehouse" />
              <option value="PPIC (Production Planning)" />
              <option value="Purchasing / Pengadaan Barang" />

              {/* Area Finance & Administrasi Pabrik */}
              <option value="Accounting & Finance" />
              <option value="Cost Accounting / Akuntansi Biaya" />
              <option value="Administrasi Produksi & Data Entry" />
              <option value="Staff HSE (Kesehatan & Keselamatan Kerja)" />
              <option value="Staff HRD / Personalia" />

              {/* Area Digitalisasi Industri & IT */}
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
              accept=".pdf" /* HANYA MENERIMA .pdf */
              onChange={handleProfileChange}
              style={{
                padding: "12px",
                backgroundColor: "var(--input-bg)",
                color: "var(--text-body)",
              }}
            />
            {profile.cv_link && (
              <small style={{ color: "var(--success)" }}>
                ✓ Anda sudah mengunggah CV. Pilih file PDF baru hanya jika ingin
                mengganti.
              </small>
            )}

            <button type="submit" className="auth-btn">
              Simpan Profil & Dokumen
            </button>
          </form>
        </div>
      )}

      {/* DASHBOARD HRD - LIHAT LAMARAN */}
      {view === "applications" && (
        <div className="auth-box" style={{ maxWidth: "850px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ marginBottom: 0 }}>Daftar Pelamar Masuk</h2>
            {applications.length > 0 && (
              <button onClick={handleExportCSV} className="btn-export">
                📥 Unduh Laporan (CSV)
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
                      <td>
                        <strong>{app.applicant_name}</strong>
                        <br />
                        <small style={{ color: "#64748b" }}>{app.email}</small>
                      </td>
                      <td>{app.job_title}</td>

                      {/* DIPERBARUI: Tautan membuka file dari server lokal kita */}
                      <td>
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
                              color: "#3b82f6",
                              fontWeight: "600",
                              textDecoration: "underline",
                            }}
                          >
                            Unduh Dokumen
                          </a>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>-</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${app.status === "Ditolak" ? "status-rejected" : app.status === "Diterima" ? "status-accepted" : ""}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td>
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
              Daftar
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
