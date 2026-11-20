// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// util.js -- Shared helpers
// ===========================================================
//   - escapeHtml()   : safe insertion of user text into innerHTML templates.
//   - normalizeUrl() : adds https:// and rejects javascript:/data: etc.
//   - send()         : promise wrapper around chrome.runtime.sendMessage.
//   - open()         : opens a URL via the background worker (new tab, same
//                      tab, background tab or new window).
//   - applyTheme()   : sets the theme attribute on the shadow host.
// ----------------------------------------------------------------------------

const WebInUtil = {
  escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  // Returns a safe http(s) URL string, or null if the input is not acceptable.
  normalizeUrl(input) {
    let url = String(input || "").trim();
    if (!url) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.href;
    } catch (e) {
      return null;
    }
  },

  looksLikeUrl(text) {
    const t = String(text || "").trim();
    if (!t || /\s/.test(t)) return false;
    return /^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(t) || /^localhost(:\d+)?(\/.*)?$/i.test(t);
  },

  isPopupContext() {
    return location.protocol === "chrome-extension:" || location.protocol === "moz-extension:";
  },

  send(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("[WebIn]", chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        console.warn("[WebIn] sendMessage failed", e);
        resolve(null);
      }
    });
  },

  // mode: "newtab" | "sametab" | "background" | "newwindow"
  async open(url, mode) {
    const safe = this.normalizeUrl(url);
    if (!safe) return;
    const res = await this.send({ action: "openUrl", url: safe, mode });
    if (!res || !res.ok) {
      // Fallback if the worker is unreachable
      if (mode === "sametab" && !this.isPopupContext()) location.href = safe;
      else window.open(safe, "_blank", "noopener");
    }
  },

  // Work out how to open a link from a mouse / keyboard event + settings.
  modeFromEvent(e) {
    if (e) {
      if (e.button === 1) return "background";
      if (e.shiftKey) return "newwindow";
      if (e.ctrlKey || e.metaKey) return "newtab";
    }
    return (WebInState.settings && WebInState.settings.openMode) || "newtab";
  },

  resolveTheme(theme) {
    if (!theme || theme === "auto") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "retro";
    }
    return theme;
  },

  applyTheme(host) {
    if (!host) return;
    host.setAttribute("data-theme", this.resolveTheme(WebInState.settings.theme));
  },

  // Download a text file from any context (page, popup, options).
  downloadText(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    (document.body || document.documentElement).appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  },
};
