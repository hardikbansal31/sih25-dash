import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

import { GLOBAL_STYLES } from "./theme.js";
import { Icon } from "./components/Icons.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { ToastContainer, useToasts } from "./components/ToastContainer.jsx";
import { ActiveJobsPanel } from "./components/ActiveJobsPanel.jsx";
import { UploadCard } from "./components/UploadCard.jsx";
import { VideoList } from "./components/VideoList.jsx";
import { HlsPlayer } from "./components/HlsPlayer.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API);

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("token");
}
function clearToken() {
  localStorage.removeItem("token");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // null = validating token, false = logged out, object = logged in user
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [activeJobs, setActiveJobs] = useState({});
  const { toasts, add: addToast, remove: removeToast } = useToasts();

  // Inject global styles once
  useEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = GLOBAL_STYLES;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  // Validate stored token on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(false);
      return;
    }
    apiFetch("/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ user }) => setUser(user))
      .catch(() => {
        clearToken();
        setUser(false);
      });
  }, []);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await apiFetch("/videos");
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    }
  }, []);

  // Socket listeners — only active when logged in
  useEffect(() => {
    if (!user) return;
    fetchVideos();

    socket.on("video-progress", ({ jobId, progress }) => {
      setActiveJobs((prev) =>
        prev[jobId] ? { ...prev, [jobId]: { ...prev[jobId], progress } } : prev,
      );
    });

    socket.on("video-completed", ({ jobId }) => {
      addToast(
        "success",
        "Processing complete",
        `Job #${jobId} — HLS stream ready.`,
      );
      setTimeout(() => {
        setActiveJobs((prev) => {
          const n = { ...prev };
          delete n[jobId];
          return n;
        });
      }, 1500);
      fetchVideos();
    });

    socket.on("video-failed", ({ jobId, message }) => {
      addToast("error", "Processing failed", `Job #${jobId}: ${message}`);
      setActiveJobs((prev) => {
        const n = { ...prev };
        delete n[jobId];
        return n;
      });
    });

    return () => {
      socket.off("video-progress");
      socket.off("video-completed");
      socket.off("video-failed");
    };
  }, [user, fetchVideos]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => {
    clearToken();
    setUser(false);
    setVideos([]);
    setSelectedVideo(null);
  };

  // XHR upload (fetch doesn't expose upload progress)
  const handleUpload = (file, onDone) => {
    const formData = new FormData();
    formData.append("video", file);
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable)
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
    };

    xhr.onload = () => {
      setUploadProgress(null);
      if (xhr.status === 202) {
        const data = JSON.parse(xhr.responseText);
        setActiveJobs((prev) => ({
          ...prev,
          [data.jobId]: { filename: file.name, progress: 0 },
        }));
        addToast(
          "info",
          "Upload complete",
          `HLS encoding queued — Job #${data.jobId}`,
        );
        onDone?.();
        fetchVideos();
      } else if (xhr.status === 401 || xhr.status === 403) {
        addToast("error", "Session expired", "Please sign in again.");
        handleLogout();
      } else {
        const err = (() => {
          try {
            return JSON.parse(xhr.responseText);
          } catch {
            return {};
          }
        })();
        addToast("error", "Upload failed", err.error ?? "Unknown error");
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      addToast("error", "Upload failed", "Network error.");
    };

    xhr.open("POST", `${API}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);
    xhr.send(formData);
    setUploadProgress(0);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (user === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="animate-spin"
          style={{ color: "var(--accent)", display: "flex" }}
        >
          <Icon.Loader size={22} />
        </span>
      </div>
    );
  }

  if (user === false) return <LoginPage onLogin={handleLogin} />;

  const isTeacher = user.role === "teacher";

  return (
    <>
      <ToastContainer toasts={toasts} remove={removeToast} />
      <ActiveJobsPanel jobs={activeJobs} />

      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        {/* ── Top bar ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 24px",
            height: 52,
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            zIndex: 100,
            flexShrink: 0,
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginRight: 8,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                background: "var(--accent-dim)",
                border: "1px solid var(--accent)33",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon.Film size={13} color="var(--accent-text)" />
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.2px",
              }}
            >
              ClassStream
            </span>
          </div>

          {/* Separator */}
          <div
            style={{
              width: 1,
              height: 18,
              background: "var(--border)",
              margin: "0 4px",
            }}
          />

          {/* Role badge */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              background: isTeacher
                ? "var(--accent-dim)"
                : "var(--bg-elevated)",
              color: isTeacher ? "var(--accent-text)" : "var(--text-tertiary)",
              border: `1px solid ${isTeacher ? "var(--accent)33" : "var(--border)"}`,
              borderRadius: 99,
              textTransform: "capitalize",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {isTeacher ? (
              <Icon.Shield size={10} color="var(--accent-text)" />
            ) : (
              <Icon.Eye size={10} />
            )}
            {user.role}
          </span>

          <div style={{ flex: 1 }} />

          {/* User + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon.User size={13} color="var(--text-tertiary)" />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                {user.username}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                padding: "5px 8px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                transition: "all var(--transition)",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--error)";
                e.currentTarget.style.borderColor = "#f8717144";
                e.currentTarget.style.background = "var(--error-dim)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-tertiary)";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "none";
              }}
            >
              <Icon.LogOut size={13} />
              Sign out
            </button>
          </div>
        </header>

        {/* ── Main ── */}
        <main
          style={{
            flex: 1,
            maxWidth: 780,
            width: "100%",
            margin: "0 auto",
            padding: "32px 24px",
          }}
        >
          {/* Upload — teachers only */}
          {isTeacher && (
            <UploadCard
              onUpload={handleUpload}
              uploadProgress={uploadProgress}
            />
          )}

          {/* Video library */}
          <VideoList
            videos={videos}
            selectedId={selectedVideo?.id}
            onSelect={setSelectedVideo}
            onRefresh={fetchVideos}
          />

          {/* Player */}
          {selectedVideo && (
            <HlsPlayer
              key={selectedVideo.id}
              hlsUrl={selectedVideo.hlsUrl}
              title={selectedVideo.original_filename}
              onClose={() => setSelectedVideo(null)}
            />
          )}
        </main>
      </div>
    </>
  );
}