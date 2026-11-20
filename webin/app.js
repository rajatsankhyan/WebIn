// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// app.js -- Shared UI builder
// ===========================================================
// Builds the complete WebIn interface inside a Shadow DOM host. Used by:
//   - inject.js        (floating overlay on web pages)
//   - popup-inject.js  (standalone popup window for restricted pages)
//
// Header actions: ★ add current page · Notes · Settings · Close
// ----------------------------------------------------------------------------

const WebInApp = {
  // opts: { popup: boolean, onClose: fn }
  build(opts) {
    const popup = !!opts.popup;
    WebInState.isDeleteMode = false;
    WebInUI.currentTab = null;

    const host = document.createElement("div");
    host.id = "webhub-shadow-host";
    host.style.cssText = popup
      ? "width:100%;height:100%;"
      : "position:fixed; z-index:2147483647; opacity:0; transform:scale(0.97) translateZ(0); will-change:transform,opacity; transition:opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);";
    WebInUI.host = host;
    WebInUtil.applyTheme(host);

    // Follow system theme changes while open (theme = auto)
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onScheme = () => WebInUtil.applyTheme(host);
      mq.addEventListener ? mq.addEventListener("change", onScheme) : mq.addListener(onScheme);
    }

    const shadow = host.attachShadow({ mode: "open" });
    WebInUI.shadow = shadow;

    const style = document.createElement("style");
    style.textContent = WEBIN_STYLES + WEBIN_STYLES_PART2 + WEBIN_STYLES_PART3 + WEBIN_STYLES_PART4;
    shadow.appendChild(style);

    if (popup) {
      const popupStyle = document.createElement("style");
      popupStyle.textContent = `
        .wrapper {
          width: 100% !important; max-width: 100% !important; height: 100vh !important;
          min-height: unset !important; border: none !important; box-shadow: none !important;
        }
        .header { cursor: default !important; }
        .resizer { display: none !important; }
      `;
      shadow.appendChild(popupStyle);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "wrapper";
    WebInUI.wrapper = wrapper;

    // ---- Header ----
    const header = document.createElement("div");
    header.className = "header";

    const titleContainer = document.createElement("div");
    titleContainer.style.cssText = "display:flex; align-items:center; gap:10px;";
    const logo = document.createElement("img");
    logo.className = "header-logo";
    logo.src = chrome.runtime.getURL("images/icon-48.png");
    logo.style.setProperty("filter", "none", "important");
    logo.alt = "";
    const title = document.createElement("span");
    title.className = "header-title";
    title.textContent = "WebIn";
    titleContainer.appendChild(logo);
    titleContainer.appendChild(title);

    const headerActions = document.createElement("div");
    headerActions.style.cssText = "display:flex; align-items:center; gap:8px;";

    const headerBtn = (html, tip, onClick) => {
      const b = document.createElement("button");
      b.className = "close";
      b.innerHTML = html;
      b.title = tip;
      b.onclick = onClick;
      headerActions.appendChild(b);
      return b;
    };

    const ctx = {
      shadow,
      onThemeChanged: () => WebInUtil.applyTheme(host),
      onDataChanged: () => this.refreshAll(),
    };

    headerBtn(WebInUI.ICONS.star, "Add current page", () => WebInUI.addCurrentPage());
    headerBtn(WebInUI.ICONS.notes, "Notes & to-do", () => WebInNotes.show(shadow));
    headerBtn(WebInUI.ICONS.settings, "Settings", () => WebInSettings.show(shadow, ctx));
    headerBtn("×", "Close (Esc)", () => opts.onClose());

    header.appendChild(titleContainer);
    header.appendChild(headerActions);
    wrapper.appendChild(header);

    // ---- Search bar ----
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";

    const searchInput = document.createElement("input");
    searchInput.className = "search-input";
    searchInput.placeholder = "Search apps…   ( > open tabs · ? web search )";
    searchInput.spellcheck = false;
    WebInUI.searchInput = searchInput;
    searchContainer.appendChild(searchInput);

    const addCategoryBtn = document.createElement("button");
    addCategoryBtn.innerHTML = WebInUI.ICONS.add;
    addCategoryBtn.title = "Add new category";
    addCategoryBtn.className = "action-btn";
    addCategoryBtn.onclick = () => {
      if (WebInState.isDeleteMode) return;
      WebInModals.showModal(shadow, {
        type: "prompt",
        title: "Add New Category",
        message: "Enter a name for the new category.",
        placeholder: "e.g., Study Material",
        primaryActionText: "Add",
        onConfirm: (name) => name && name.trim() && WebInTabs.addCategory(name),
      });
    };

    const deleteModeBtn = document.createElement("button");
    deleteModeBtn.innerHTML = WebInUI.ICONS.delete;
    deleteModeBtn.title = "Delete category mode";
    deleteModeBtn.className = "action-btn delete-mode-btn";
    deleteModeBtn.onclick = () => WebInTabs.toggleDeleteMode();

    searchContainer.appendChild(addCategoryBtn);
    searchContainer.appendChild(deleteModeBtn);
    wrapper.appendChild(searchContainer);

    // ---- Category navigation ----
    const nav = document.createElement("div");
    nav.className = "nav";
    const navTabsContainer = document.createElement("div");
    navTabsContainer.className = "nav-tabs";
    WebInUI.navTabsContainer = navTabsContainer;
    nav.appendChild(navTabsContainer);
    wrapper.appendChild(nav);

    // ---- Content ----
    const content = document.createElement("div");
    content.className = "content";
    WebInUI.content = content;
    wrapper.appendChild(content);

    // ---- Footer ----
    const footer = document.createElement("div");
    footer.className = "footer";
    footer.innerHTML =
      "<kbd>↑↓←→</kbd> select · <kbd>Enter</kbd> open · <kbd>Tab</kbd> category · <kbd>Esc</kbd> close";
    wrapper.appendChild(footer);

    if (!popup) {
      const resizerSE = document.createElement("div");
      resizerSE.className = "resizer se";
      resizerSE.dataset.direction = "se";
      wrapper.appendChild(resizerSE);
    }

    shadow.appendChild(wrapper);

    WebInEvents.setupSearchEvents();
    WebInEvents.setupKeyboard(wrapper);
    WebInTabs.rebuildNav();
    WebInUI.setActiveTab(WebInState.getStartTab());

    return { host, wrapper, header };
  },

  // Re-render everything after import / reset / sync
  refreshAll() {
    WebInTabs.toggleDeleteMode(false);
    WebInUI.searchInput.value = "";
    WebInTabs.rebuildNav();
    const keep = WebInState.tabs.includes(WebInUI.currentTab) ? WebInUI.currentTab : WebInState.getStartTab();
    WebInUI.setActiveTab(keep);
  },
};
