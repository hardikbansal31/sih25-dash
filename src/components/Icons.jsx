// All icons are pure SVG, sized via the `size` prop (default 16).
// Stroke-based so they scale cleanly at any size.
// Usage: <Icon.Upload size={20} />

const icon = (path, opts = {}) => {
  const { viewBox = "0 0 16 16", fill = "none", strokeWidth = 1.5 } = opts;
  return function Icon({
    size = 16,
    color = "currentColor",
    style,
    className,
  }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill={fill}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
        className={className}
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  };
};

export const Icon = {
  Upload: icon(
    <>
      <path d="M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
      <polyline points="10.5,5 8,2.5 5.5,5" />
      <line x1="8" y1="2.5" x2="8" y2="10.5" />
    </>,
  ),
  Play: icon(
    <>
      <polygon points="3,1.5 14.5,8 3,14.5" fill="currentColor" stroke="none" />
    </>,
    { fill: "currentColor" },
  ),
  Check: icon(
    <>
      <polyline points="2,8 6,12 14,4" />
    </>,
  ),
  X: icon(
    <>
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </>,
  ),
  AlertCircle: icon(
    <>
      <circle cx="8" cy="8" r="6.5" />
      <line x1="8" y1="5" x2="8" y2="8.5" />
      <circle cx="8" cy="11" r="0.5" fill="currentColor" />
    </>,
  ),
  Info: icon(
    <>
      <circle cx="8" cy="8" r="6.5" />
      <line x1="8" y1="7.5" x2="8" y2="11" />
      <circle cx="8" cy="5.5" r="0.5" fill="currentColor" />
    </>,
  ),
  LogOut: icon(
    <>
      <path d="M6 2.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
      <polyline points="10.5,5 13.5,8 10.5,11" />
      <line x1="13.5" y1="8" x2="5.5" y2="8" />
    </>,
  ),
  User: icon(
    <>
      <circle cx="8" cy="5.5" r="3" />
      <path d="M2 13.5c0-2.76 2.69-5 6-5s6 2.24 6 5" />
    </>,
  ),
  Film: icon(
    <>
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
      <line x1="5.5" y1="3" x2="5.5" y2="13" />
      <line x1="10.5" y1="3" x2="10.5" y2="13" />
      <line x1="1.5" y1="8" x2="5.5" y2="8" />
      <line x1="10.5" y1="8" x2="14.5" y2="8" />
    </>,
  ),
  Refresh: icon(
    <>
      <path d="M1.5 8A6.5 6.5 0 1 0 3.8 3.2" />
      <polyline points="1.5,1.5 1.5,4.5 4.5,4.5" />
    </>,
  ),
  ChevronDown: icon(
    <>
      <polyline points="3,5.5 8,10.5 13,5.5" />
    </>,
  ),
  Settings: icon(
    <>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" />
    </>,
  ),
  Loader: icon(
    <>
      <circle cx="8" cy="8" r="6.5" strokeOpacity="0.25" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" />
    </>,
  ),
  Video: icon(
    <>
      <path d="M1.5 4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1z" />
      <polyline points="11.5,6 14.5,4 14.5,12 11.5,10" />
    </>,
  ),
  Shield: icon(
    <>
      <path d="M8 1.5L2 4v4c0 3.31 2.5 5.5 6 6.5 3.5-1 6-3.19 6-6.5V4z" />
    </>,
  ),
  Eye: icon(
    <>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </>,
  ),
  FileVideo: icon(
    <>
      <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z" />
      <polyline points="9,1.5 9,6 13,6" />
      <polygon points="6,7.5 6,10.5 10,9" />
    </>,
  ),
};
