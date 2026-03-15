import { ProgressBar } from "./ProgressBar.jsx";
import { Icon } from "./Icons.jsx";

const RENDITIONS = ["720p", "480p", "360p"];

export function ActiveJobsPanel({ jobs }) {
  const entries = Object.entries(jobs);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9990,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 296,
      }}
    >
      {entries.map(([jobId, job]) => (
        <div
          key={jobId}
          className="animate-slideUp"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span
              className="animate-spin"
              style={{ color: "var(--accent)", flexShrink: 0, display: "flex" }}
            >
              <Icon.Loader size={14} />
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--text-primary)",
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {job.filename}
            </span>
            <span
              style={{
                fontSize: 10.5,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              #{jobId}
            </span>
          </div>

          <ProgressBar
            value={job.progress}
            height={3}
            label="Encoding HLS"
            sublabel={`${job.progress}%`}
          />

          {/* Rendition pills */}
          <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
            {RENDITIONS.map((r, i) => {
              const done = job.progress >= (i + 1) * 33;
              const active = job.progress >= i * 33 && !done;
              return (
                <div
                  key={r}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 10.5,
                    fontWeight: 500,
                    padding: "3px 0",
                    borderRadius: "var(--radius-sm)",
                    background: done
                      ? "var(--accent-dim)"
                      : active
                        ? "#ffffff08"
                        : "transparent",
                    color: done
                      ? "var(--accent-text)"
                      : active
                        ? "var(--text-secondary)"
                        : "var(--text-tertiary)",
                    border: `1px solid ${done ? "var(--accent)33" : "var(--border)"}`,
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                  }}
                >
                  {done && <Icon.Check size={9} color="var(--accent-text)" />}
                  {r}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
