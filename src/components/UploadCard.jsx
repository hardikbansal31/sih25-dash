import { useState, useRef } from "react";
import { FileThumbnail } from "./FileThumbnail.jsx";
import { ProgressBar } from "./ProgressBar.jsx";
import { Icon } from "./Icons.jsx";

const BTN = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 16px",
    borderRadius: "var(--radius-md)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    transition: "background var(--transition), opacity var(--transition)",
  },
};

export function UploadCard({ onUpload, uploadProgress }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const isUploading = uploadProgress !== null;

  const handleFiles = (files) => {
    const f = files[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || isUploading) return;
    onUpload(file, () => setFile(null));
  };

  return (
    <section
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Icon.Upload size={15} color="var(--text-secondary)" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Upload Video
        </span>
      </div>

      {/* Drop zone (shown only when no file selected) */}
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragging ? "var(--accent)" : "var(--border-strong)"}`,
            borderRadius: "var(--radius-md)",
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "var(--accent-dim)" : "transparent",
            transition: "all var(--transition)",
            marginBottom: 14,
          }}
        >
          <Icon.FileVideo
            size={28}
            color={dragging ? "var(--accent)" : "var(--text-tertiary)"}
            style={{ margin: "0 auto 8px" }}
          />
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: dragging ? "var(--accent-text)" : "var(--text-secondary)",
              marginBottom: 3,
            }}
          >
            Drop a video here
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            or click to browse · mp4, mov, mkv, webm · max 500 MB
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files[0]) setFile(e.target.files[0]);
          e.target.value = "";
        }}
      />

      {/* File preview */}
      <FileThumbnail file={file} onClear={() => setFile(null)} />

      {/* Upload progress */}
      {isUploading && (
        <div style={{ marginBottom: 14 }}>
          <ProgressBar
            value={uploadProgress}
            height={3}
            color="var(--success)"
            label="Uploading"
            sublabel={`${uploadProgress}%`}
            animated={uploadProgress < 100}
          />
        </div>
      )}

      {/* Actions row */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        {file && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              ...BTN.base,
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-overlay)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-elevated)")
            }
          >
            <Icon.Refresh size={13} />
            Change
          </button>
        )}

        <button
          type="submit"
          disabled={!file || isUploading}
          style={{
            ...BTN.base,
            marginLeft: "auto",
            background:
              !file || isUploading ? "var(--bg-elevated)" : "var(--accent)",
            color: !file || isUploading ? "var(--text-tertiary)" : "#fff",
            cursor: !file || isUploading ? "not-allowed" : "pointer",
            opacity: !file ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (file && !isUploading)
              e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            if (file && !isUploading)
              e.currentTarget.style.background = "var(--accent)";
          }}
        >
          <Icon.Upload size={13} />
          {isUploading ? `Uploading ${uploadProgress}%` : "Upload"}
        </button>
      </form>
    </section>
  );
}
