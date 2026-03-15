import { Icon } from "./Icons.jsx";

export function VideoList({ videos, selectedId, onSelect, onRefresh }) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon.Film size={15} color="var(--text-secondary)" />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Library
          </span>
          {videos.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "1px 7px",
                background: "var(--bg-elevated)",
                color: "var(--text-tertiary)",
                borderRadius: 99,
                border: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {videos.length}
            </span>
          )}
        </div>

        <button
          onClick={onRefresh}
          title="Refresh"
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: "5px 7px",
            display: "flex",
            alignItems: "center",
            transition: "all var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-tertiary)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <Icon.Refresh size={13} />
        </button>
      </div>

      {videos.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "52px 20px",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-tertiary)",
          }}
        >
          <Icon.Film
            size={28}
            color="var(--bg-elevated)"
            style={{ margin: "0 auto 10px" }}
          />
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            No videos yet
          </div>
          <div style={{ fontSize: 12 }}>Upload a video to get started</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {videos.map((vid) => {
            const isSelected = vid.id === selectedId;
            return (
              <div
                key={vid.id}
                onClick={() => onSelect(vid)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  border: `1px solid ${isSelected ? "var(--accent)44" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  background: isSelected
                    ? "var(--accent-dim)"
                    : "var(--bg-surface)",
                  cursor: "pointer",
                  transition: "all var(--transition)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "var(--bg-elevated)";
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "var(--bg-surface)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "var(--radius-sm)",
                    background: isSelected
                      ? "var(--accent-dim)"
                      : "var(--bg-elevated)",
                    border: `1px solid ${isSelected ? "var(--accent)33" : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon.FileVideo
                    size={15}
                    color={
                      isSelected ? "var(--accent-text)" : "var(--text-tertiary)"
                    }
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: isSelected
                        ? "var(--text-primary)"
                        : "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginBottom: 2,
                    }}
                  >
                    {vid.original_filename}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    HLS · 720p / 480p / 360p
                  </div>
                </div>

                {/* Play indicator */}
                <div
                  style={{
                    color: isSelected
                      ? "var(--accent)"
                      : "var(--text-tertiary)",
                    display: "flex",
                    flexShrink: 0,
                    opacity: isSelected ? 1 : 0.4,
                  }}
                >
                  <Icon.Play size={12} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
