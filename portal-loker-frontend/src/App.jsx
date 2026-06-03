import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [view, setView] = useState("home");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userRole, setUserRole] = useState(localStorage.getItem("role") || "");

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
      // Jika ada kata kunci, tambahkan ?search=... ke URL
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

  useEffect(() => {
    fetchJobs();
    if (token && userRole === "perusahaan") {
      fetchApplications();
    }
  }, [token, userRole]);

  const handleAuthChange = (e) =>
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  const handleJobChange = (e) =>
    setJobForm({ ...jobForm, [e.target.name]: e.target.value });

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

    // Memunculkan kotak input pop-up bawaan browser
    const cvLink = window.prompt(
      "Masukkan Link CV atau Portofolio Anda\n(Contoh: Tautan Google Drive atau LinkedIn):",
    );

    // Jika user menekan tombol 'Cancel' pada pop-up, hentikan proses
    if (cvLink === null) return;

    // Jika user menekan OK tapi kolomnya kosong
    if (cvLink.trim() === "")
      return alert("Gagal melamar: Link CV wajib diisi!");

    try {
      const res = await fetch("http://localhost:5000/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: jobId, cv_link: cvLink }), // Mengirim cv_link
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(
        "Lamaran berhasil dikirim beserta CV Anda! HRD akan segera meninjau.",
      );
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // FUNGSI BARU: HRD Mengubah Status Lamaran
  // ==========================================
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

      // Tarik ulang data pelamar agar tabel langsung ter-update di layar
      fetchApplications();
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // FUNGSI BARU: Ekspor Data ke CSV (Digital Reporting)
  // ==========================================
  const handleExportCSV = () => {
    if (applications.length === 0)
      return alert("Belum ada data untuk diekspor!");

    // 1. Membuat Header Kolom
    const headers = [
      "Nama Pelamar",
      "Email",
      "Posisi",
      "Link CV",
      "Status Saat Ini",
    ];

    // 2. Mengambil dan merapikan data dari state 'applications'
    const rows = applications.map((app) => [
      `"${app.applicant_name}"`, // Diberi tanda kutip agar aman jika ada koma di nama
      `"${app.email}"`,
      `"${app.job_title}"`,
      `"${app.cv_link ? app.cv_link : "Tidak ada link"}"`,
      `"${app.status}"`,
    ]);

    // 3. Menggabungkan Header dan Baris Data menjadi format teks CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // 4. Membuat file virtual dan memicu proses Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Rekap_Laporan_Rekrutmen.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setView("home")}>
          Portal Kerja
        </div>
        <div className="nav-links">
          <button onClick={() => setView("home")}>Beranda</button>

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
          {/* KOTAK PENCARIAN BARU */}
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

      {/* DASHBOARD HRD - LIHAT LAMARAN */}
      {view === "applications" && (
        <div className="auth-box" style={{ maxWidth: "850px" }}>
          {/* HEADER DASHBOARD DENGAN TOMBOL EKSPOR */}
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

                      <td>
                        {app.cv_link ? (
                          <a
                            href={
                              app.cv_link.startsWith("http")
                                ? app.cv_link
                                : `https://${app.cv_link}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#2563eb",
                              fontWeight: "600",
                              textDecoration: "underline",
                            }}
                          >
                            Lihat Dokumen
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
