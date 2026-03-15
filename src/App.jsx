import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

// ── Toast system ──────────────────────────────────────────────────────────────

let toastId = 0;

function useToasts() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((type, title, message) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => remove(id), 5000);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, add, remove };
}

const TOAST_ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 9.25l2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 6l6 6M12 6l-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 8v5M9 5.5v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const TOAST_STYLES = {
  success: {
    bg: "#f0fdf4",
    border: "#86efac",
    text: "#166534",
    icon: "#16a34a",
  },
  error: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "#dc2626" },
  info: { bg: "#f0f9ff", border: "#7dd3fc", text: "#0c4a6e", icon: "#0284c7" },
};

function ToastContainer({ toasts, remove }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 360,
      }}
    >
      {toasts.map((t) => {
        const s = TOAST_STYLES[t.type];
        return (
          <div
            key={t.id}
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              animation: "slideIn 0.22s cubic-bezier(.22,.68,0,1.2) forwards",
            }}
          >
            <span style={{ color: s.icon, marginTop: 1, flexShrink: 0 }}>
              {TOAST_ICONS[t.type]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: s.text,
                  marginBottom: 2,
                }}
              >
                {t.title}
              </div>
              {t.message && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: s.text,
                    opacity: 0.8,
                    lineHeight: 1.45,
                  }}
                >
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: s.text,
                opacity: 0.5,
                padding: 0,
                fontSize: 18,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Reusable progress bar ─────────────────────────────────────────────────────

function ProgressBar({ value, color = "#3b82f6", label, sublabel }) {
  return (
    <div style={{ width: "100%" }}>
      {(label || sublabel) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          {label && (
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
              {label}
            </span>
          )}
          {sublabel && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>{sublabel}</span>
          )}
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: 6,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            background: color,
            width: `${value}%`,
            transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

// ── Active jobs panel (bottom-right, one card per in-progress job) ────────────

const RESOLUTIONS = ["720p", "480p", "360p"];

function ActiveJobsPanel({ jobs }) {
  if (Object.keys(jobs).length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9990,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: 300,
      }}
    >
      {Object.entries(jobs).map(([jobId, job]) => (
        <div
          key={jobId}
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
            animation: "slideUp 0.25s cubic-bezier(.22,.68,0,1.2) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <svg
              style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <circle cx="7" cy="7" r="5.5" stroke="#e5e7eb" strokeWidth="2" />
              <path
                d="M7 1.5A5.5 5.5 0 0 1 12.5 7"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#1e293b",
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {job.filename}
            </span>
            <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>
              #{jobId}
            </span>
          </div>

          <ProgressBar
            value={job.progress}
            color="#3b82f6"
            label="Compressing"
            sublabel={`${job.progress}%`}
          />

          {/* Resolution milestone pills */}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {RESOLUTIONS.map((r, i) => {
              const milestone = (i + 1) * 33;
              const done = job.progress >= milestone;
              const active = job.progress >= i * 33 && !done;
              return (
                <div
                  key={r}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 11,
                    padding: "3px 0",
                    borderRadius: 6,
                    background: done
                      ? "#dbeafe"
                      : active
                        ? "#eff6ff"
                        : "#f1f5f9",
                    color: done ? "#1d4ed8" : active ? "#3b82f6" : "#94a3b8",
                    fontWeight: done || active ? 600 : 400,
                    transition: "all 0.3s",
                  }}
                >
                  {r}
                  {done && " ✓"}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── File thumbnail ────────────────────────────────────────────────────────────

function FileThumbnail({ file, onClear }) {
  const [thumb, setThumb] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!file) {
      setThumb(null);
      setDuration(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = url;
    vid.onloadedmetadata = () => {
      setDuration(vid.duration);
      vid.currentTime = Math.min(1.5, vid.duration * 0.1);
    };
    vid.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = Math.round((vid.videoHeight / vid.videoWidth) * 320) || 180;
      c.getContext("2d").drawImage(vid, 0, 0, c.width, c.height);
      setThumb(c.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
    };
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file) return null;

  const fmt = (s) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const fmtSize = (b) =>
    b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 88,
          height: 54,
          borderRadius: 6,
          overflow: "hidden",
          background: "#1e293b",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
        {duration && (
          <span
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              background: "rgba(0,0,0,0.72)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            {fmt(duration)}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1e293b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {file.name}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {fmtSize(file.size)}
          {duration ? ` · ${fmt(duration)}` : ""}
        </div>
      </div>
      <button
        onClick={onClear}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#94a3b8",
          fontSize: 20,
          padding: "0 2px",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [file, setFile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // null = idle
  const [activeJobs, setActiveJobs] = useState({}); // { jobId: { filename, progress } }
  const { toasts, add: addToast, remove: removeToast } = useToasts();

  const fetchVideos = async () => {
    try {
      const res = await fetch("http://localhost:5000/videos");
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    }
  };

  useEffect(() => {
    fetchVideos();

    // Worker → Redis → server → here
    socket.on("video-progress", ({ jobId, progress }) => {
      setActiveJobs((prev) =>
        prev[jobId] ? { ...prev, [jobId]: { ...prev[jobId], progress } } : prev,
      );
    });

    socket.on("video-completed", ({ jobId }) => {
      addToast(
        "success",
        "Processing complete",
        `Job #${jobId} — all resolutions ready.`,
      );
      // Linger at 100% briefly so the user sees it finish
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
  }, []);

  // Use XHR instead of fetch — only XHR exposes upload progress events
  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;

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
        // Register this job so its progress card appears
        setActiveJobs((prev) => ({
          ...prev,
          [data.jobId]: { filename: file.name, progress: 0 },
        }));
        addToast(
          "info",
          "Upload complete",
          `Compression queued — Job #${data.jobId}`,
        );
        setFile(null);
        fetchVideos();
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
      addToast(
        "error",
        "Upload failed",
        "Network error — check your connection.",
      );
    };

    xhr.open("POST", "http://localhost:5000/upload");
    xhr.send(formData);
    setUploadProgress(0);
  };

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setSelectedResolution(
      [...video.versions].sort(
        (a, b) => parseInt(b.resolution) - parseInt(a.resolution),
      )[0],
    );
  };

  const isUploading = uploadProgress !== null;

  return (
    <>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        .btn-blue:hover:not(:disabled)  { background:#2563eb !important; }
        .btn-green:hover:not(:disabled) { background:#15803d !important; }
        .btn-teal:hover  { background:#0f766e !important; }
        .video-item:hover{ border-color:#bfdbfe !important; background:#f8fafc !important; }
      `}</style>

      <ToastContainer toasts={toasts} remove={removeToast} />
      <ActiveJobsPanel jobs={activeJobs} />

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "40px 24px",
          color: "#1e293b",
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 4,
            letterSpacing: "-0.3px",
          }}
        >
          Teacher Upload Portal
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 32px" }}>
          Upload a video — automatically compressed to 720p, 480p, and 360p.
        </p>

        {/* Upload card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 20,
            marginBottom: 32,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <FileThumbnail file={file} onClear={() => setFile(null)} />

          <form
            onSubmit={handleUpload}
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            <label
              className="btn-blue"
              style={{
                padding: "9px 18px",
                background: "#3b82f6",
                color: "#fff",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 500,
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              {file ? "Change file" : "Choose file"}
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files[0]) setFile(e.target.files[0]);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>

            {!file && (
              <span style={{ fontSize: 13, color: "#94a3b8" }}>
                No file selected
              </span>
            )}

            <button
              type="submit"
              disabled={!file || isUploading}
              className="btn-green"
              style={{
                marginLeft: "auto",
                padding: "9px 22px",
                background: !file || isUploading ? "#d1d5db" : "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: !file || isUploading ? "not-allowed" : "pointer",
                fontSize: 13.5,
                fontWeight: 500,
                transition: "background 0.15s",
              }}
            >
              {isUploading ? `Uploading… ${uploadProgress}%` : "Upload"}
            </button>
          </form>

          {isUploading && (
            <div style={{ marginTop: 14 }}>
              <ProgressBar
                value={uploadProgress}
                color="#16a34a"
                label="Uploading to server"
                sublabel={`${uploadProgress}%`}
              />
            </div>
          )}
        </div>

        {/* Video list */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              Available Videos
            </h2>
            <button
              onClick={fetchVideos}
              className="btn-teal"
              style={{
                padding: "7px 14px",
                background: "#0d9488",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                transition: "background 0.15s",
              }}
            >
              Refresh
            </button>
          </div>

          {videos.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "#94a3b8",
                fontSize: 14,
                border: "1px dashed #e2e8f0",
                borderRadius: 12,
              }}
            >
              No videos uploaded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  className="video-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    background: "#fff",
                    transition: "all 0.15s",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {vid.original_filename}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                    >
                      {vid.versions.length} version
                      {vid.versions.length !== 1 ? "s" : ""} ·{" "}
                      {[...vid.versions]
                        .sort(
                          (a, b) =>
                            parseInt(b.resolution) - parseInt(a.resolution),
                        )
                        .map((v) => `${v.resolution}p`)
                        .join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectVideo(vid)}
                    className="btn-blue"
                    style={{
                      padding: "7px 16px",
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      transition: "background 0.15s",
                    }}
                  >
                    ▶ Play
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player */}
        {selectedVideo && selectedResolution && (
          <div style={{ marginTop: 36 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {selectedVideo.original_filename}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, color: "#64748b" }}>
                  Quality
                </label>
                <select
                  value={selectedResolution.resolution}
                  onChange={(e) =>
                    setSelectedResolution(
                      selectedVideo.versions.find(
                        (v) => v.resolution === e.target.value,
                      ),
                    )
                  }
                  style={{
                    padding: "5px 10px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 7,
                    fontSize: 13,
                    background: "#fff",
                    color: "#1e293b",
                  }}
                >
                  {[...selectedVideo.versions]
                    .sort(
                      (a, b) => parseInt(b.resolution) - parseInt(a.resolution),
                    )
                    .map((v) => (
                      <option key={v.id} value={v.resolution}>
                        {v.resolution}p
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <video
              key={selectedResolution.filename}
              controls
              style={{
                width: "100%",
                borderRadius: 12,
                background: "#000",
                display: "block",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              }}
              src={`http://localhost:5000/stream/${selectedResolution.filename}`}
              type="video/webm"
            />
          </div>
        )}
      </div>
    </>
  );
}
