// Inject this once at app root via useEffect or import in main.jsx
// All components reference these variables — never hardcode colors.

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    /* Base */
    --bg-base:        #0d0f12;
    --bg-surface:     #13161b;
    --bg-elevated:    #1a1e26;
    --bg-overlay:     #22283300;

    /* Borders */
    --border:         #ffffff0f;
    --border-strong:  #ffffff18;
    --border-focus:   #3b7eff55;

    /* Text */
    --text-primary:   #f0f2f5;
    --text-secondary: #a8b3c0;
    --text-tertiary:  #7d8fa0;
    --text-inverse:   #0d0f12;

    /* Accent — electric blue */
    --accent:         #3b7eff;
    --accent-hover:   #5b8fff;
    --accent-dim:     #3b7eff22;
    --accent-text:    #7eb0ff;

    /* Status */
    --success:        #22c55e;
    --success-dim:    #22c55e18;
    --error:          #f87171;
    --error-dim:      #f8717118;
    --warning:        #fbbf24;
    --warning-dim:    #fbbf2418;
    --info:           #38bdf8;
    --info-dim:       #38bdf818;

    /* Misc */
    --radius-sm:      6px;
    --radius-md:      10px;
    --radius-lg:      14px;
    --radius-xl:      20px;
    --font-sans:      'DM Sans', system-ui, sans-serif;
    --font-mono:      'DM Mono', 'Fira Code', monospace;
    --shadow-sm:      0 1px 3px rgba(0,0,0,0.4);
    --shadow-md:      0 4px 16px rgba(0,0,0,0.5);
    --shadow-lg:      0 8px 32px rgba(0,0,0,0.6);
    --transition:     0.15s cubic-bezier(0.4,0,0.2,1);
  }

  html, body, #root {
    height: 100%;
    background: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

  /* Animations */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(8px)  } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn   { from { opacity:0 }                             to { opacity:1 } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
  @keyframes slideUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes spin     { to   { transform:rotate(360deg) } }
  @keyframes pulse    { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
  @keyframes shimmer  {
    0%   { background-position: -400px 0 }
    100% { background-position:  400px 0 }
  }

  /* Utility classes */
  .animate-fadeUp  { animation: fadeUp  0.25s var(--transition) forwards; }
  .animate-fadeIn  { animation: fadeIn  0.2s  ease forwards; }
  .animate-slideIn { animation: slideIn 0.22s cubic-bezier(.22,.68,0,1.2) forwards; }
  .animate-slideUp { animation: slideUp 0.22s cubic-bezier(.22,.68,0,1.2) forwards; }
  .animate-spin    { animation: spin    1s    linear infinite; }
  .animate-pulse   { animation: pulse  1.5s  ease infinite; }

  /* Focus ring */
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  /* Video element */
  video { display: block; }
`;
