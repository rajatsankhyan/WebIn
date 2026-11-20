// ----------------------------------------------------------------------------
// WebIn -- options-inject.js
// ===========================================================
// Entry point for options.html (the extension's full settings page,
// reachable from the browser's extension menu → "Options"). Renders the same
// settings panel used inside the overlay.
// ----------------------------------------------------------------------------

(() => {
  WebInState.loadState(() => {
    const host = document.createElement("div");
    host.id = "webhub-shadow-host";
    WebInUtil.applyTheme(host);
    const shadow = host.attachShadow({ mode: "open" });
    WebInUI.shadow = shadow;

    const style = document.createElement("style");
    style.textContent =
      WEBIN_STYLES + WEBIN_STYLES_PART2 + WEBIN_STYLES_PART3 + WEBIN_STYLES_PART4 +
      `
      .page { min-height: 100vh !important; background: var(--w-bg) !important; display: flex !important;
              justify-content: center !important; padding: 40px 16px !important; position: relative !important; }
      .page > .modal { animation: none !important; transform: none !important; max-height: none !important; }
      .modal-backdrop { position: fixed !important; }
      `;
    shadow.appendChild(style);

    const page = document.createElement("div");
    page.className = "page";
    const panel = document.createElement("div");
    panel.className = "modal wide";
    page.appendChild(panel);
    shadow.appendChild(page);
    document.body.appendChild(host);

    const render = () =>
      WebInSettings.render(panel, {
        shadow,
        standalone: true,
        onThemeChanged: () => WebInUtil.applyTheme(host),
        onDataChanged: () => {},
      });
    render();

    // Keep in sync if data changes in another window
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[WebInState.KEYS.tabs]) {
        WebInState.tabs = changes[WebInState.KEYS.tabs].newValue || WebInState.tabs;
      }
    });
  });
})();
