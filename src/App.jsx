// import { useState, useEffect } from "react";
// import { io } from "socket.io-client";

// const socket = io("http://localhost:5000");

// function App() {
//   const [file, setFile] = useState(null);
//   const [videos, setVideos] = useState([]);
//   const [selectedVideo, setSelectedVideo] = useState(null);
//   const [selectedResolution, setSelectedResolution] = useState(null);
//   const [uploading, setUploading] = useState(false);

//   // Fetch videos from server
//   const fetchVideos = async () => {
//     try {
//       const res = await fetch("http://localhost:5000/videos");

//       if (!res.ok) {
//         throw new Error("Server error");
//       }

//       const data = await res.json();

//       if (Array.isArray(data)) {
//         setVideos(data);
//       } else {
//         setVideos([]);
//       }
//     } catch (err) {
//       console.error("Error fetching videos:", err);
//       setVideos([]); // prevent crash
//     }
//   };

//   useEffect(() => {
//     fetchVideos();

//     // NEW: Listen for the success event from the server
//     socket.on("video-completed", (data) => {
//       alert(data.message); // In a real app, use a nice toast notification here!
//       fetchVideos(); // Automatically refresh the list!
//     });

//     socket.on("video-failed", (data) => {
//       alert(`Video processing failed for Job ${data.jobId}`);
//     });

//     // Cleanup listener when component unmounts
//     return () => {
//       socket.off("video-completed");
//       socket.off("video-failed");
//     };
//   }, []);

//   // Upload handler
//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) return alert("Please select a file");

//     const formData = new FormData();
//     formData.append("video", file);

//     try {
//       setUploading(true);
//       const res = await fetch("http://localhost:5000/upload", {
//         method: "POST",
//         body: formData,
//       });

//       if (!res.ok) throw new Error("Upload failed");

//       // We now get a Job ID back from the queue!
//       const data = await res.json();
//       alert(
//         `Upload successful! Video is now processing in the background. (Job ID: ${data.jobId})`,
//       );

//       setFile(null);
//       // We might want to fetch videos here, but the new video won't have its resolutions yet!
//       fetchVideos();
//     } catch (err) {
//       console.error(err);
//       alert("Error uploading");
//     } finally {
//       setUploading(false);
//     }
//   };

//   // Handle video selection
//   const handleSelectVideo = (video) => {
//     setSelectedVideo(video);
//     // Default to highest resolution
//     const sortedRes = [...video.versions].sort(
//       (a, b) => parseInt(b.resolution) - parseInt(a.resolution),
//     );
//     setSelectedResolution(sortedRes[0]);
//   };

//   return (
//     <div className="bg-white min-h-screen p-8 text-gray-800">
//       <h1 className="text-3xl font-bold mb-6">Teacher Upload Portal</h1>

//       {/* Upload Form */}
//       <form onSubmit={handleUpload} className="flex items-center gap-4 mb-6">
//         <label className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
//           Choose File
//           <input
//             type="file"
//             onChange={(e) => setFile(e.target.files[0])}
//             className="hidden"
//           />
//         </label>

//         <button
//           type="submit"
//           disabled={!file || uploading}
//           className={`px-5 py-2 rounded-md text-white transition ${
//             !file
//               ? "bg-gray-400 cursor-not-allowed"
//               : "bg-green-600 hover:bg-green-700"
//           }`}
//         >
//           {uploading ? "Uploading..." : "Upload"}
//         </button>
//       </form>

//       <hr className="my-6" />

//       {/* Video List */}
//       <div>
//         <div className="flex items-center justify-between mb-3">
//           <h2 className="text-2xl font-semibold">Available Videos</h2>
//           <button
//             onClick={fetchVideos}
//             className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
//           >
//             Refresh List
//           </button>
//         </div>

//         {videos.length === 0 ? (
//           <p className="text-gray-500">No videos uploaded yet.</p>
//         ) : (
//           <ul className="space-y-3">
//             {videos.map((vid) => (
//               <li
//                 key={vid.id}
//                 className="flex items-center justify-between p-3 border rounded-md shadow-sm"
//               >
//                 <span className="font-medium">{vid.original_filename}</span>
//                 <button
//                   onClick={() => handleSelectVideo(vid)}
//                   className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
//                 >
//                   Play
//                 </button>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Video Player */}
//       {selectedVideo && selectedResolution && (
//         <div className="mt-10">
//           <h3 className="text-xl font-semibold mb-4">
//             Now Playing: {selectedVideo.original_filename}
//           </h3>

//           {/* Resolution selector */}
//           <div className="mb-4">
//             <label className="mr-2 font-medium">Select Resolution:</label>
//             <select
//               value={selectedResolution.resolution}
//               onChange={(e) =>
//                 setSelectedResolution(
//                   selectedVideo.versions.find(
//                     (v) => v.resolution === e.target.value,
//                   ),
//                 )
//               }
//               className="px-3 py-2 border rounded-md"
//             >
//               {selectedVideo.versions
//                 .sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution))
//                 .map((v) => (
//                   <option key={v.id} value={v.resolution}>
//                     {v.resolution}p
//                   </option>
//                 ))}
//             </select>
//           </div>

//           <video
//             width="800"
//             controls
//             className="border rounded-lg shadow-lg"
//             src={`http://localhost:5000/stream/${selectedResolution.filename}`}
//             type="video/webm"
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;

import { useState, useEffect, useRef, useCallback } from "react";
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
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, add, remove };
}

const ICONS = {
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
              {ICONS[t.type]}
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
                fontSize: 16,
                lineHeight: 1,
                flexShrink: 0,
                marginTop: -1,
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

// ── Thumbnail preview ─────────────────────────────────────────────────────────
function FileThumbnail({ file, onClear }) {
  const [thumb, setThumb] = useState(null);
  const [duration, setDuration] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      setDuration(video.duration);
      video.currentTime = Math.min(1.5, video.duration * 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height =
        Math.round((video.videoHeight / video.videoWidth) * 320) || 180;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumb(canvas.toDataURL("image/jpeg", 0.85));
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
      {/* Thumbnail */}
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

      {/* Meta */}
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

      {/* Clear */}
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
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [file, setFile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { toasts, add: addToast, remove: removeToast } = useToasts();

  const fetchVideos = async () => {
    try {
      const res = await fetch("http://localhost:5000/videos");
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching videos:", err);
      setVideos([]);
    }
  };

  useEffect(() => {
    fetchVideos();

    socket.on("video-completed", (data) => {
      addToast(
        "success",
        "Processing complete",
        `Job #${data.jobId} finished. Video is ready to play.`,
      );
      fetchVideos();
    });

    socket.on("video-failed", (data) => {
      addToast(
        "error",
        "Processing failed",
        `Job #${data.jobId} encountered an error.`,
      );
    });

    return () => {
      socket.off("video-completed");
      socket.off("video-failed");
    };
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("video", file);

    try {
      setUploading(true);
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      addToast(
        "info",
        "Upload successful",
        `Compression queued — Job #${data.jobId}. You'll be notified when it's ready.`,
      );
      setFile(null);
      fetchVideos();
    } catch (err) {
      addToast(
        "error",
        "Upload failed",
        "Something went wrong. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    const sorted = [...video.versions].sort(
      (a, b) => parseInt(b.resolution) - parseInt(a.resolution),
    );
    setSelectedResolution(sorted[0]);
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .upload-label:hover { background: #2563eb !important; }
        .upload-btn:hover:not(:disabled) { background: #15803d !important; }
        .refresh-btn:hover { background: #0f766e !important; }
        .play-btn:hover { background: #2563eb !important; }
        .video-item:hover { border-color: #bfdbfe !important; background: #f8fafc !important; }
      `}</style>

      <ToastContainer toasts={toasts} remove={removeToast} />

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
          Upload a video — it will be automatically compressed to 720p, 480p,
          and 360p.
        </p>

        {/* ── Upload form ── */}
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
              className="upload-label"
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
              disabled={!file || uploading}
              className="upload-btn"
              style={{
                marginLeft: "auto",
                padding: "9px 22px",
                background: !file || uploading ? "#d1d5db" : "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: !file || uploading ? "not-allowed" : "pointer",
                fontSize: 13.5,
                fontWeight: 500,
                transition: "background 0.15s",
              }}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </form>
        </div>

        {/* ── Video list ── */}
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
              className="refresh-btn"
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
                      {vid.versions
                        .map((v) => `${v.resolution}p`)
                        .sort((a, b) => parseInt(b) - parseInt(a))
                        .join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectVideo(vid)}
                    className="play-btn"
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

        {/* ── Video player ── */}
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
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: "#1e293b",
                }}
              >
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
                    cursor: "pointer",
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

export default App;