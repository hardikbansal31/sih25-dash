import { useState } from "react";
import { Icon } from "./Icons.jsx";

const API = "http://localhost:5000";

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (focused) => ({
    width: "100%",
    padding: "9px 12px",
    background: "var(--bg-base)",
    border: `1px solid ${focused ? "var(--accent)" : "var(--border-strong)"}`,
    borderRadius: "var(--radius-md)",
    fontSize: 13.5,
    color: "var(--text-primary)",
    outline: "none",
    fontFamily: "var(--font-sans)",
    boxSizing: "border-box",
    transition: "border-color var(--transition)",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: 20,
      }}
    >
      {/* Subtle grid pattern */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />

      <div
        className="animate-fadeUp"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 380,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-xl)",
          padding: 36,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 40,
            height: 40,
            background: "var(--accent-dim)",
            border: "1px solid var(--accent)44",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Icon.Film size={18} color="var(--accent-text)" />
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            margin: "0 0 4px",
            color: "var(--text-primary)",
            letterSpacing: "-0.3px",
          }}
        >
          Sign in
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            margin: "0 0 28px",
          }}
        >
          Video platform · Teacher &amp; Student access
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
                letterSpacing: "0.03em",
              }}
            >
              USERNAME
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              style={inputStyle(false)}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--border-strong)")
              }
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
                letterSpacing: "0.03em",
              }}
            >
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...inputStyle(false), paddingRight: 40 }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-strong)")
                }
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  display: "flex",
                  padding: 2,
                  transition: "color var(--transition)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-tertiary)")
                }
              >
                <Icon.Eye size={14} />
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                color: "var(--error)",
                background: "var(--error-dim)",
                border: "1px solid #f8717128",
                borderRadius: "var(--radius-sm)",
                padding: "9px 12px",
              }}
            >
              <Icon.AlertCircle size={13} color="var(--error)" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              background: loading ? "var(--bg-elevated)" : "var(--accent)",
              color: loading ? "var(--text-tertiary)" : "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background var(--transition)",
              marginTop: 4,
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = "var(--accent)";
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ display: "flex" }}>
                  <Icon.Loader size={14} />
                </span>{" "}
                Signing in…
              </>
            ) : (
              <>
                Sign in{" "}
                <Icon.ChevronDown
                  size={13}
                  style={{ transform: "rotate(-90deg)" }}
                />
              </>
            )}
          </button>
        </form>

        {/* Role hint */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 12,
          }}
        >
          {[
            { role: "Teacher", icon: Icon.Upload, desc: "Upload & view" },
            { role: "Student", icon: Icon.Eye, desc: "View only" },
          ].map(({ role, icon: RoleIcon, desc }) => (
            <div
              key={role}
              style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RoleIcon size={13} color="var(--text-tertiary)" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  {role}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
