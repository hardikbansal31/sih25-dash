import { useState, useEffect } from "react";
import { Icon } from "./Icons.jsx";

export function FileThumbnail({ file, onClear }) {
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
      className="animate-fadeUp"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        background: "var(--bg-base)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
        marginBottom: 14,
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 80,
          height: 50,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          background: "var(--bg-base)",
          flexShrink: 0,
          position: "relative",
          border: "1px solid var(--border)",
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
            <Icon.FileVideo size={20} color="var(--text-tertiary)" />
          </div>
        )}
        {duration && (
          <span
            style={{
              position: "absolute",
              bottom: 3,
              right: 3,
              background: "rgba(0,0,0,0.8)",
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 500,
              padding: "1px 4px",
              borderRadius: 3,
              fontFamily: "var(--font-mono)",
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
            fontWeight: 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 3,
          }}
        >
          {file.name}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {fmtSize(file.size)}
          {duration ? `  ·  ${fmt(duration)}` : ""}
        </div>
      </div>

      {/* Clear */}
      <button
        onClick={onClear}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          padding: 4,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          borderRadius: "var(--radius-sm)",
          transition: "color var(--transition), background var(--transition)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--error)";
          e.currentTarget.style.background = "var(--error-dim)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-tertiary)";
          e.currentTarget.style.background = "none";
        }}
      >
        <Icon.X size={14} />
      </button>
    </div>
  );
}
