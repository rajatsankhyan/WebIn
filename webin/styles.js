// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
// If this project helped you, consider starring the repository, opening a
// pull request, or reporting issues on GitHub. Contributions are welcome.
// ----------------------------------------------------------------------------
//
// styles.js -- Core Stylesheet (Part 1 of 3)
// ===========================================================
// Contains the primary CSS rules for the WebIn overlay UI, injected into
// the Shadow DOM to avoid conflicts with host page styles. Includes:
//   - Base reset and IBM Plex Mono font import.
//   - Wrapper, header, and close button styling.
//   - Navigation tabs with horizontal scrolling.
//   - Search bar and action button styles.
//   - Card image, modal input, and animation keyframes.
// ----------------------------------------------------------------------------

const WEBIN_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');

/* ---- Theme tokens (set via data-theme on the shadow host) ---- */
:host, :host([data-theme="retro"]) {
  --w-bg: #f5f5dc; --w-bg2: #e8e8c8; --w-bg3: #d5d5b5; --w-surface: #fff;
  --w-text: #333; --w-muted: #666; --w-shadow: #888; --w-border: #000;
  --w-accent: #8b4513; --w-accent2: #a0522d;
  --w-active-bg: #333; --w-active-fg: #fff;
  --w-danger: #721c24; --w-danger-bg: #f8d7da;
  --w-select: #8b4513;
}
:host([data-theme="dark"]) {
  --w-bg: #1e1e1e; --w-bg2: #2a2a2a; --w-bg3: #3a3a3a; --w-surface: #2f2f2f;
  --w-text: #e8e8e8; --w-muted: #a0a0a0; --w-shadow: #000; --w-border: #555;
  --w-accent: #d2803a; --w-accent2: #e09550;
  --w-active-bg: #d2803a; --w-active-fg: #fff;
  --w-danger: #ff8a8a; --w-danger-bg: #4a2020;
  --w-select: #e09550;
}
:host([data-theme="ocean"]) {
  --w-bg: #eaf4fb; --w-bg2: #d4e8f5; --w-bg3: #b9d6ea; --w-surface: #fff;
  --w-text: #10324a; --w-muted: #4a6a80; --w-shadow: #7fa3bb; --w-border: #10324a;
  --w-accent: #1565c0; --w-accent2: #1e88e5;
  --w-active-bg: #10324a; --w-active-fg: #fff;
  --w-danger: #b71c1c; --w-danger-bg: #ffdede;
  --w-select: #1565c0;
}
:host([data-theme="forest"]) {
  --w-bg: #eef3e8; --w-bg2: #dce6d0; --w-bg3: #c5d4b3; --w-surface: #fff;
  --w-text: #23361a; --w-muted: #5a6b50; --w-shadow: #8da07e; --w-border: #23361a;
  --w-accent: #2e7d32; --w-accent2: #43a047;
  --w-active-bg: #23361a; --w-active-fg: #fff;
  --w-danger: #9b1c1c; --w-danger-bg: #f6d6d6;
  --w-select: #2e7d32;
}

* {
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
  font-family: 'IBM Plex Mono', 'Consolas', monospace !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}

.wrapper {
  width: 90vw;
  max-width: 900px;
  height: 70vh;
  min-height: 520px;
  background: var(--w-bg) !important;
  color: var(--w-text) !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0px var(--w-border) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 2px solid var(--w-border) !important;
  will-change: transform !important;
  transform: translateZ(0) !important;
}

.header {
  background: linear-gradient(90deg, var(--w-accent), var(--w-accent2)) !important;
  padding: 12px 16px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  cursor: grab !important;
  user-select: none !important;
  border-bottom: 2px solid var(--w-border) !important;
}

.header-logo {
  width: 22px !important;
  height: 22px !important;
  filter: brightness(0) invert(1) !important;
}

.header-title {
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #fff !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
}

.close {
  background: transparent !important;
  border: 1px solid #fff !important;
  font-size: 18px !important;
  cursor: pointer !important;
  color: #fff !important;
  width: 26px !important;
  height: 26px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 0 !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  line-height: 1 !important;
}

.close svg {
  width: 14px !important;
  height: 14px !important;
  fill: #fff !important;
}

.close:hover {
  background: var(--w-surface) !important;
}

.close:hover svg {
  fill: var(--w-accent) !important;
}

.nav {
  display: flex !important;
  padding: 10px !important;
  background: var(--w-bg2) !important;
  align-items: center !important;
  border-bottom: 2px solid var(--w-border) !important;
}

.nav-tabs {
  display: flex !important;
  gap: 6px !important;
  flex-grow: 1 !important;
  overflow-x: auto !important;
  flex-wrap: nowrap !important;
  padding-bottom: 8px !important;
  margin-bottom: -8px !important;
  scroll-behavior: smooth !important;
}

.nav-tabs::-webkit-scrollbar {
  height: 4px !important;
}

.nav-tabs::-webkit-scrollbar-track {
  background: var(--w-bg3) !important;
}

.nav-tabs::-webkit-scrollbar-thumb {
  background: var(--w-accent) !important;
}

.nav button {
  line-height: 1.4 !important;
  padding: 6px 12px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  border: 1px solid var(--w-border) !important;
  border-radius: 0 !important;
  cursor: pointer !important;
  background: var(--w-surface) !important;
  color: var(--w-muted) !important;
  box-shadow: 2px 2px 0px var(--w-shadow) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  flex-shrink: 0 !important;
  text-transform: uppercase !important;
}

.nav button:hover {
  background: var(--w-bg2) !important;
  color: var(--w-text) !important;
}

.nav button.active {
  background: var(--w-active-bg) !important;
  color: var(--w-active-fg) !important;
  border-color: var(--w-border) !important;
}

.nav.delete-mode .nav-tabs button {
  background: var(--w-danger-bg) !important;
  color: var(--w-danger) !important;
  border-color: var(--w-danger) !important;
  cursor: crosshair !important;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px !important;
  background: var(--w-bg2) !important;
  border-bottom: 2px solid var(--w-border) !important;
}

.search-input {
  flex-grow: 1;
  width: 100% !important;
  padding: 8px 12px !important;
  border-radius: 0 !important;
  border: 1px solid var(--w-border) !important;
  font-size: 13px !important;
  outline: none !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background-color: var(--w-surface) !important;
  color: var(--w-text) !important;
  font-family: 'IBM Plex Mono', monospace !important;
}

.search-input::placeholder {
  color: var(--w-muted) !important;
  opacity: 1 !important;
}

.search-input:focus {
  border-color: var(--w-accent) !important;
  box-shadow: 2px 2px 0px var(--w-accent) !important;
}

.action-btn {
  background: var(--w-surface) !important;
  border: 1px solid var(--w-border) !important;
  padding: 6px !important;
  width: 34px !important;
  height: 34px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 0 !important;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 2px 2px 0px var(--w-shadow) !important;
}

.card img {
  width: 44px !important;
  height: 44px !important;
  margin-bottom: 8px !important;
  object-fit: contain !important;
  border: 1px solid var(--w-border) !important;
  padding: 4px !important;
  background: var(--w-surface) !important;
}

.modal-input, .modal-select {
  width: 100% !important;
  padding: 10px 12px !important;
  border: 1px solid var(--w-border) !important;
  border-radius: 0 !important;
  font-size: 13px !important;
  background: var(--w-surface) !important;
  color: var(--w-text) !important;
  font-family: 'IBM Plex Mono', monospace !important;
}

.modal-input:focus, .modal-select:focus {
  outline: none !important;
  border-color: var(--w-accent) !important;
  box-shadow: 2px 2px 0px var(--w-accent) !important;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(12px) translateZ(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) translateZ(0);
  }
}

@keyframes modal-scale-in {
  0% {
    opacity: 0;
    transform: scale(0.92) translateZ(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateZ(0);
  }
}
`;
