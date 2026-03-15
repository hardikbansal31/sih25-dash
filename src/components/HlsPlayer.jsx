import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icons.jsx";

export function HlsPlayer({ hlsUrl, title, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [autoLevel, setAutoLevel] = useState(-1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;
    setReady(false);

    function initHls(Hls) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          startLevel: -1,
          abrEwmaDefaultEstimate: 500_000,
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          const lvls = data.levels
            .map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate }))
            .sort((a, b) => b.height - a.height);
          setLevels(lvls);
          setCurrentLevel(-1);
          setReady(true);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) =>
          setAutoLevel(data.level),
        );
        hlsRef.current = hls;
      } else if (
        videoRef.current.canPlayType("application/vnd.apple.mpegurl")
      ) {
        videoRef.current.src = hlsUrl;
        setReady(true);
      }
    }

    if (window.Hls) {
      initHls(window.Hls);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js";
    script.onload = () => initHls(window.Hls);
    document.head.appendChild(script);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl]);

  const handleQualityChange = (e) => {
    const level = parseInt(e.target.value);
    setCurrentLevel(level);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  };

  const activeLevel = levels.find(
    (l) => l.index === (currentLevel === -1 ? autoLevel : currentLevel),
  );

  return (
    <div
      className="animate-fadeUp"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        marginTop: 24,
      }}
    >
      {/* Player header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Icon.Video size={14} color="var(--text-tertiary)" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>

        {/* Quality selector */}
        {levels.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {currentLevel === -1 && activeLevel && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  padding: "2px 7px",
                  background: "var(--accent-dim)",
                  color: "var(--accent-text)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--accent)33",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Auto · {activeLevel.height}p
              </span>
            )}
            <div style={{ position: "relative" }}>
              <select
                value={currentLevel}
                onChange={handleQualityChange}
                style={{
                  appearance: "none",
                  padding: "5px 26px 5px 10px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <option value={-1}>Auto</option>
                {levels.map((l) => (
                  <option key={l.index} value={l.index}>
                    {l.height}p
                  </option>
                ))}
              </select>
              <span
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--text-tertiary)",
                }}
              >
                <Icon.ChevronDown size={11} />
              </span>
            </div>
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              padding: 4,
              borderRadius: "var(--radius-sm)",
              transition:
                "color var(--transition), background var(--transition)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--bg-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "none";
            }}
          >
            <Icon.X size={14} />
          </button>
        )}
      </div>

      {/* Video */}
      <div style={{ background: "#000", position: "relative" }}>
        {!ready && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-base)",
            }}
          >
            <span
              className="animate-spin"
              style={{ color: "var(--accent)", display: "flex" }}
            >
              <Icon.Loader size={24} />
            </span>
          </div>
        )}
        <video
          ref={videoRef}
          controls
          style={{ width: "100%", display: "block", maxHeight: "60vh" }}
        />
      </div>
    </div>
  );
}
