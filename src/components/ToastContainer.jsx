import { useCallback, useState } from "react";
import { Icon } from "./Icons.jsx";

let _toastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((type, title, message) => {
    const id = ++_toastId;
    setToasts((p) => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  const remove = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  return { toasts, add, remove };
}

const CONFIG = {
  success: {
    icon: Icon.Check,
    color: "var(--success)",
    bg: "var(--success-dim)",
    border: "#22c55e28",
  },
  error: {
    icon: Icon.AlertCircle,
    color: "var(--error)",
    bg: "var(--error-dim)",
    border: "#f8717128",
  },
  info: {
    icon: Icon.Info,
    color: "var(--info)",
    bg: "var(--info-dim)",
    border: "#38bdf828",
  },
};

export function ToastContainer({ toasts, remove }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 340,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const c = CONFIG[t.type] ?? CONFIG.info;
        const IconComponent = c.icon;
        return (
          <div
            key={t.id}
            className="animate-slideIn"
            style={{
              background: "var(--bg-elevated)",
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.color}`,
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: "var(--shadow-md)",
              pointerEvents: "all",
            }}
          >
            <span style={{ color: c.color, marginTop: 1, flexShrink: 0 }}>
              <IconComponent size={15} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: 13,
                  color: "var(--text-primary)",
                  marginBottom: t.message ? 2 : 0,
                }}
              >
                {t.title}
              </div>
              {t.message && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
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
                color: "var(--text-tertiary)",
                padding: 0,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                transition: "color var(--transition)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-tertiary)")
              }
            >
              <Icon.X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
