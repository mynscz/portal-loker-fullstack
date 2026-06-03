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

  const fetchJobs = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/jobs");
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

  // FUNGSI BARU: Melamar Pekerjaan
  const handleApply = async (jobId) => {
    if (!token) return alert("Silakan login sebagai pelamar terlebih dahulu!");
    if (userRole === "perusahaan")
      return alert("Akun perusahaan tidak bisa melamar pekerjaan!");

    try {
      const res = await fetch("http://localhost:5000/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert("Lamaran berhasil dikirim! HRD akan segera meninjau.");
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
        <div className="auth-box" style={{ maxWidth: "700px" }}>
          <h2>Daftar Pelamar Masuk</h2>
          {applications.length === 0 ? (
            <p style={{ textAlign: "center" }}>Belum ada pelamar saat ini.</p>
          ) : (
            // UBAH DARI SINI: Tambahkan pembungkus div dan hapus style inline pada table
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Pelamar</th>
                    <th>Posisi</th>
                    <th>Status</th>
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
                        <span className="status-badge">{app.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            // SAMPAI SINI
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
