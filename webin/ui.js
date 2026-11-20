// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
//
// ui.js -- UI Rendering Engine
// ===========================================================
//   - createCard()          : app card with favicon, name, edit menu,
//                             click / ctrl-click / middle-click handling and
//                             drag & drop reordering.
//   - renderContent()       : "Most used" row + the active category grid with
//                             an "Open all" (workspace) button.
//   - renderSearchResults() : command palette:
//                               text   -> apps in all categories (name / URL)
//                               > text -> switch to an open browser tab
//                               ? text -> search the web
//   - keyboard selection    : getNavigable / select / moveSelection.
// ----------------------------------------------------------------------------

const WebInUI = {
  currentTab: null,
  shadow: null,
  host: null,
  wrapper: null,
  content: null,
  searchInput: null,
  navTabsContainer: null,
  selectedIndex: -1,
  kbdNav: false,
  _searchToken: 0,
  close: () => {},

  ICONS: {
    add: `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
    delete: `<svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/></svg>`,
    reset: `<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    more: `<svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>`,
    notes: `<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>`,
  },

  // ============== Opening links ==============
  openItem(item, e) {
    const mode = WebInUtil.modeFromEvent(e);
    WebInState.recordUse(item.url);
    WebInUtil.open(item.url, mode);
    if (mode === "sametab" && !WebInUtil.isPopupContext()) this.close();
  },

  openAllInCategory(category) {
    const items = WebInState.tabContent[category] || [];
    if (!items.length) return;
    const go = () => {
      items.forEach((i) => WebInState.recordUse(i.url));
      WebInUtil.send({ action: "openAll", urls: items.map((i) => i.url), title: category });
    };
    if (items.length > 8) {
      WebInModals.showModal(this.shadow, {
        type: "confirm",
        title: "Open all?",
        message: `This will open ${items.length} tabs in a new tab group.`,
        primaryActionText: "Open all",
        onConfirm: (ok) => ok && go(),
      });
    } else {
      go();
    }
  },

  // ============== Cards ==============
  createCard(item, categoryName, index = 0, { draggable = false } = {}) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${Math.min(index, 20) * 0.03}s`;
    card.title = item.url;
    card.onclick = (e) => this.openItem(item, e);
    card.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.openItem(item, e);
      }
    });
    card.addEventListener("mousedown", (e) => {
      if (e.button === 1) e.preventDefault(); // stop autoscroll icon
    });
    card._webinActivate = (e) => this.openItem(item, e);

    const img = document.createElement("img");
    img.alt = "";
    img.src = WEBIN_CONFIG.FALLBACK_ICON_SVG;
    img.draggable = false;

    const p = document.createElement("p");
    p.textContent = item.name;

    const menuBtn = document.createElement("button");
    menuBtn.className = "card-menu-btn";
    menuBtn.innerHTML = this.ICONS.more;
    menuBtn.title = "Edit app";
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      this.showEditModal(item, categoryName);
    };

    card.appendChild(img);
    card.appendChild(p);
    card.appendChild(menuBtn);

    if (draggable) {
      card.draggable = true;
      card.dataset.index = String(index);
    }

    const iconUrl = WebInState.getFaviconUrl(item.url, item.icon);
    WebInState.fetchIconViaBackground(iconUrl).then((dataUrl) => {
      if (dataUrl) {
        img.src = dataUrl;
      } else {
        img.onerror = () => {
          img.onerror = null;
          img.src = WEBIN_CONFIG.FALLBACK_ICON_SVG;
        };
        img.src = iconUrl;
      }
    });

    return card;
  },

  sectionBar(label, count, actions = []) {
    const bar = document.createElement("div");
    bar.className = "section-bar";
    const title = document.createElement("span");
    title.textContent = label;
    if (count != null) {
      const c = document.createElement("span");
      c.className = "count";
      c.textContent = ` · ${count}`;
      title.appendChild(c);
    }
    bar.appendChild(title);
    if (actions.length) {
      const box = document.createElement("span");
      box.style.cssText = "display:flex; gap:6px;";
      actions.forEach(({ text, title: tip, onClick }) => {
        const b = document.createElement("button");
        b.className = "mini-btn";
        b.textContent = text;
        if (tip) b.title = tip;
        b.onclick = onClick;
        box.appendChild(b);
      });
      bar.appendChild(box);
    }
    return bar;
  },

  emptyState(text) {
    const div = document.createElement("div");
    div.className = "empty-state";
    const p = document.createElement("p");
    p.textContent = text;
    div.appendChild(p);
    return div;
  },

  // ============== Category view ==============
  renderContent() {
    this.content.innerHTML = "";
    this.content.className = "content";
    this.resetSelection();

    if (!this.currentTab) {
      this.content.appendChild(this.emptyState("No categories yet. Click + next to the search bar to add one!"));
      return;
    }

    // "Most used" row
    if (WebInState.settings.showFrequent) {
      const frequent = WebInState.getFrequent(6);
      if (frequent.length) {
        this.content.appendChild(
          this.sectionBar("★ Most used", null, [
            {
              text: "Clear",
              title: "Clear usage history",
              onClick: () => {
                WebInState.usage = {};
                chrome.storage.local.set({ [WebInState.KEYS.usage]: {} });
                this.renderContent();
              },
            },
          ])
        );
        const fGrid = document.createElement("div");
        fGrid.className = "category-grid";
        frequent.forEach(({ item, cat }, i) => fGrid.appendChild(this.createCard(item, cat, i)));
        this.content.appendChild(fGrid);
      }
    }

    const category = this.currentTab;
    const items = WebInState.tabContent[category] || [];
    const actions = [];
    if (items.length) {
      actions.push({
        text: `Open all (${items.length})`,
        title: "Open every app in this category as a tab group",
        onClick: () => this.openAllInCategory(category),
      });
    }
    this.content.appendChild(this.sectionBar(category, items.length, actions));

    const grid = document.createElement("div");
    grid.className = "category-grid";
    items.forEach((item, index) =>
      grid.appendChild(this.createCard(item, category, index, { draggable: true }))
    );

    if (items.length === 0) {
      grid.appendChild(this.emptyState("This category is empty. Click the + card or ★ in the header to add an app!"));
    }

    const addCard = document.createElement("div");
    addCard.className = "card add-card";
    addCard.innerHTML = this.ICONS.add;
    addCard.title = `Add new app to ${category}`;
    addCard.onclick = () => this.showAddAppModal(category);
    grid.appendChild(addCard);

    this.setupCardDrag(grid, category);
    this.content.appendChild(grid);
  },

  // Drag & drop reordering inside a category grid
  setupCardDrag(grid, category) {
    let fromIndex = null;
    grid.addEventListener("dragstart", (e) => {
      const card = e.target.closest && e.target.closest(".card[draggable='true']");
      if (!card) return;
      fromIndex = Number(card.dataset.index);
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(fromIndex));
    });
    grid.addEventListener("dragend", () => {
      fromIndex = null;
      grid.querySelectorAll(".dragging, .drag-over").forEach((el) => el.classList.remove("dragging", "drag-over"));
    });
    grid.addEventListener("dragover", (e) => {
      if (fromIndex === null) return;
      const target = e.target.closest && e.target.closest(".card");
      if (!target) return;
      e.preventDefault();
      grid.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
      target.classList.add("drag-over");
    });
    grid.addEventListener("drop", (e) => {
      if (fromIndex === null) return;
      const target = e.target.closest && e.target.closest(".card");
      if (!target) return;
      e.preventDefault();
      const list = WebInState.tabContent[category];
      let toIndex = target.classList.contains("add-card") ? list.length : Number(target.dataset.index);
      const [moved] = list.splice(fromIndex, 1);
      if (toIndex > fromIndex) toIndex -= 1;
      list.splice(toIndex, 0, moved);
      fromIndex = null;
      WebInState.saveState();
      this.renderContent();
    });
  },

  // ============== Command palette / search ==============
  paletteRow({ icon, glyph, title, sub, onActivate }) {
    const row = document.createElement("div");
    row.className = "palette-row";
    if (icon) {
      const img = document.createElement("img");
      img.src = icon;
      img.onerror = () => (img.src = WEBIN_CONFIG.FALLBACK_ICON_SVG);
      row.appendChild(img);
    } else {
      const g = document.createElement("span");
      g.className = "p-icon";
      g.textContent = glyph || "›";
      row.appendChild(g);
    }
    const t = document.createElement("span");
    t.className = "p-title";
    t.textContent = title;
    row.appendChild(t);
    if (sub) {
      const s = document.createElement("span");
      s.className = "p-sub";
      s.textContent = sub;
      row.appendChild(s);
    }
    row.onclick = (e) => onActivate(e);
    row._webinActivate = onActivate;
    return row;
  },

  webSearchRow(q) {
    return this.paletteRow({
      glyph: "?",
      title: `Search the web for “${q}”`,
      sub: "Google",
      onActivate: (e) =>
        WebInUtil.open("https://www.google.com/search?q=" + encodeURIComponent(q), WebInUtil.modeFromEvent(e)),
    });
  },

  renderSearchResults(rawQuery) {
    const token = ++this._searchToken;
    this.content.innerHTML = "";
    this.content.className = "content";
    this.resetSelection();
    const query = rawQuery.trim();

    // "> text" : switch to an open browser tab
    if (query.startsWith(">")) {
      const q = query.slice(1).trim().toLowerCase();
      this.content.appendChild(this.sectionBar("Open tabs", null));
      WebInUtil.send({ action: "listTabs" }).then((res) => {
        if (token !== this._searchToken) return;
        const tabs = ((res && res.tabs) || []).filter(
          (t) => !q || (t.title || "").toLowerCase().includes(q) || (t.url || "").toLowerCase().includes(q)
        );
        const list = document.createElement("div");
        list.className = "palette-list";
        tabs.slice(0, 50).forEach((t) =>
          list.appendChild(
            this.paletteRow({
              icon: t.favIconUrl && /^https?:|^data:/.test(t.favIconUrl) ? t.favIconUrl : null,
              glyph: "▢",
              title: t.title || t.url,
              sub: t.url,
              onActivate: () => {
                WebInUtil.send({ action: "switchTab", tabId: t.id, windowId: t.windowId });
                if (!WebInUtil.isPopupContext()) this.close();
              },
            })
          )
        );
        if (!tabs.length) list.appendChild(this.emptyState("No open tabs match."));
        this.content.appendChild(list);
        this.autoSelectFirst();
      });
      return;
    }

    // "? text" : web search
    if (query.startsWith("?")) {
      const q = query.slice(1).trim();
      const list = document.createElement("div");
      list.className = "palette-list";
      if (q) list.appendChild(this.webSearchRow(q));
      else list.appendChild(this.emptyState("Type something to search the web."));
      this.content.appendChild(list);
      this.autoSelectFirst();
      return;
    }

    // App search across all categories (name and URL)
    const q = query.toLowerCase();
    let total = 0;
    WebInState.tabs.forEach((category) => {
      const items = WebInState.tabContent[category] || [];
      const matches = items
        .filter((item) => item.name.toLowerCase().includes(q) || item.url.toLowerCase().includes(q))
        .sort(
          (a, b) =>
            Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q))
        );
      if (!matches.length) return;
      total += matches.length;
      this.content.appendChild(this.sectionBar(category, matches.length));
      const grid = document.createElement("div");
      grid.className = "category-grid";
      matches.forEach((item, i) => grid.appendChild(this.createCard(item, category, i)));
      this.content.appendChild(grid);
    });

    // Fallback actions
    this.content.appendChild(this.sectionBar(total ? "More" : "No apps found", null));
    const list = document.createElement("div");
    list.className = "palette-list";
    if (WebInUtil.looksLikeUrl(query)) {
      list.appendChild(
        this.paletteRow({
          glyph: "↗",
          title: `Open ${query}`,
          sub: "URL",
          onActivate: (e) => WebInUtil.open(query, WebInUtil.modeFromEvent(e)),
        })
      );
    }
    list.appendChild(this.webSearchRow(query));
    const hint = document.createElement("div");
    hint.className = "palette-hint";
    hint.textContent = "Tip: start with > to search open tabs, ? to search the web.";
    list.appendChild(hint);
    this.content.appendChild(list);
    this.autoSelectFirst();
  },

  // ============== Keyboard selection ==============
  getNavigable() {
    return Array.from(this.content.querySelectorAll(".card:not(.add-card), .palette-row"));
  },

  resetSelection() {
    this.selectedIndex = -1;
    this.kbdNav = false;
  },

  autoSelectFirst() {
    if (this.searchInput && this.searchInput.value.trim()) this.select(0, false);
  },

  select(index, scroll = true) {
    const items = this.getNavigable();
    items.forEach((el) => el.classList.remove("selected"));
    if (!items.length) {
      this.selectedIndex = -1;
      return;
    }
    this.selectedIndex = Math.max(0, Math.min(index, items.length - 1));
    const el = items[this.selectedIndex];
    el.classList.add("selected");
    if (scroll) el.scrollIntoView({ block: "nearest" });
  },

  // dir: "left" | "right" | "up" | "down" — geometric, works across grids & lists
  moveSelection(dir) {
    const items = this.getNavigable();
    if (!items.length) return;
    this.kbdNav = true;
    if (this.selectedIndex < 0) return this.select(0);
    if (dir === "left") return this.select(this.selectedIndex - 1);
    if (dir === "right") return this.select(this.selectedIndex + 1);

    const cur = items[this.selectedIndex].getBoundingClientRect();
    const cx = cur.left + cur.width / 2;
    const candidates = items
      .map((el, i) => ({ i, r: el.getBoundingClientRect() }))
      .filter(({ r }) => (dir === "down" ? r.top > cur.top + 5 : r.top < cur.top - 5));
    if (!candidates.length) return;
    const rowTop =
      dir === "down"
        ? Math.min(...candidates.map((c) => c.r.top))
        : Math.max(...candidates.map((c) => c.r.top));
    const row = candidates.filter((c) => Math.abs(c.r.top - rowTop) < 5);
    row.sort(
      (a, b) =>
        Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx)
    );
    this.select(row[0].i);
  },

  activateSelected(e) {
    const items = this.getNavigable();
    const el = items[this.selectedIndex >= 0 ? this.selectedIndex : 0];
    if (el && el._webinActivate) {
      el._webinActivate(e);
      return true;
    }
    return false;
  },
};
