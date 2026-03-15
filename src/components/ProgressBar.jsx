export function ProgressBar({
  value,
  color = "var(--accent)",
  trackColor = "var(--bg-elevated)",
  height = 4,
  label,
  sublabel,
  animated = false,
}) {
  return (
    <div style={{ width: "100%" }}>
      {(label || sublabel) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 7,
          }}
        >
          {label && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: "100%",
          height,
          background: trackColor,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            background: animated
              ? `linear-gradient(90deg, ${color}88, ${color}, ${color}88)`
              : color,
            backgroundSize: animated ? "200% 100%" : undefined,
            animation: animated ? "shimmer 1.5s linear infinite" : undefined,
            width: `${Math.max(0, Math.min(100, value))}%`,
            transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}
