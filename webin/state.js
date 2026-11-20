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
// state.js -- Application State Manager
// ===========================================================
// Manages the persistent state of the WebIn extension using
// chrome.storage.local. Handles saving, loading, and resetting of:
//   - Tab categories (ordered list of category names).
//   - Tab content (apps/links stored under each category).
//   - Icon caching via background script to bypass CSP restrictions.
//   - Favicon URL resolution with custom icon override support.
//   - User settings (theme, open mode, default category, sync...).
//   - Usage statistics for the "Most used" row.
//   - Notes & to-do list.
//   - Optional cross-device sync through chrome.storage.sync (chunked,
//     because sync storage allows max ~8 KB per item / 100 KB total).
//
// State lifecycle:
//   - On first load, initializes from WEBIN_CONFIG defaults.
//   - On subsequent loads, restores from chrome.storage.local.
//   - Validates stored data integrity and resets if corrupt.
// ----------------------------------------------------------------------------

const WebInState = {
  tabs: null,
  tabContent: null,
  settings: null,
  usage: {},
  lastTab: null,
  updatedAt: 0,
  isDeleteMode: false,
  iconCache: new Map(),

  KEYS: {
    tabs: "webhub_tabs_v1",
    content: "webhub_tabContent_v1",
    settings: "webhub_settings_v1",
    usage: "webhub_usage_v1",
    lastTab: "webhub_lastTab_v1",
    updated: "webhub_updatedAt_v1",
    notes: "webhub_notes_v1",
  },

  DEFAULT_SETTINGS: {
    theme: "auto", // auto | retro | dark | ocean | forest
    openMode: "newtab", // newtab | sametab
    defaultTab: "", // "" = remember last used category
    showFrequent: true,
    syncEnabled: false,
  },

  SYNC_CHUNK: 1800, // characters per sync item (stays under the 8 KB item quota)
  SYNC_PREFIX: "webin_sync_",

  hasStorage() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  },

  saveState() {
    if (!this.hasStorage()) return;
    this.updatedAt = Date.now();
    chrome.storage.local.set(
      {
        [this.KEYS.tabs]: this.tabs,
        [this.KEYS.content]: this.tabContent,
        [this.KEYS.updated]: this.updatedAt,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("WebIn Error: Failed to save state.", chrome.runtime.lastError);
        }
      }
    );
    if (this.settings && this.settings.syncEnabled) this.scheduleSyncPush();
  },

  saveSettings() {
    if (!this.hasStorage()) return;
    chrome.storage.local.set({ [this.KEYS.settings]: this.settings });
  },

  saveLastTab(tab) {
    this.lastTab = tab;
    if (this.hasStorage()) chrome.storage.local.set({ [this.KEYS.lastTab]: tab });
  },

  recordUse(url) {
    const entry = this.usage[url] || { count: 0, last: 0 };
    entry.count += 1;
    entry.last = Date.now();
    this.usage[url] = entry;
    if (this.hasStorage()) chrome.storage.local.set({ [this.KEYS.usage]: this.usage });
  },

  // Top N apps by use count (only apps that still exist).
  getFrequent(limit = 6) {
    const byUrl = new Map();
    Object.entries(this.tabContent || {}).forEach(([cat, items]) =>
      items.forEach((item) => {
        if (!byUrl.has(item.url)) byUrl.set(item.url, { item, cat });
      })
    );
    return Object.entries(this.usage)
      .filter(([url]) => byUrl.has(url))
      .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)
      .slice(0, limit)
      .map(([url]) => byUrl.get(url));
  },

  // Category to show when the overlay opens.
  getStartTab() {
    const s = this.settings || {};
    if (s.defaultTab && this.tabs.includes(s.defaultTab)) return s.defaultTab;
    if (this.lastTab && this.tabs.includes(this.lastTab)) return this.lastTab;
    return this.tabs.length > 0 ? this.tabs[0] : null;
  },

  initializeDefaultState() {
    this.tabs = [...WEBIN_CONFIG.DEFAULT_TABS];
    this.tabContent = JSON.parse(JSON.stringify(WEBIN_CONFIG.DEFAULT_TAB_CONTENT));
    this.saveState();
  },

  isValidData(tabs, tabContent) {
    return (
      Array.isArray(tabs) &&
      tabs.every((t) => typeof t === "string") &&
      !!tabContent &&
      typeof tabContent === "object" &&
      !Array.isArray(tabContent) &&
      tabs.every((t) => Array.isArray(tabContent[t]))
    );
  },

  // Clean imported data: keep only http(s) links, trim names.
  sanitizeData(tabs, tabContent) {
    const outTabs = [];
    const outContent = {};
    tabs.forEach((t) => {
      const name = String(t).trim().slice(0, 60);
      if (!name || outContent[name]) return;
      outTabs.push(name);
      outContent[name] = (tabContent[t] || [])
        .map((item) => {
          const url = WebInUtil.normalizeUrl(item && item.url);
          if (!url) return null;
          const clean = { name: String(item.name || url).trim().slice(0, 80), url };
          if (item.icon) {
            const icon = WebInUtil.normalizeUrl(item.icon);
            if (icon) clean.icon = icon;
          }
          return clean;
        })
        .filter(Boolean);
    });
    return { tabs: outTabs, tabContent: outContent };
  },

  loadState(callback) {
    if (!this.hasStorage()) {
      console.error("WebIn Error: chrome.storage.local is not available.");
      this.settings = { ...this.DEFAULT_SETTINGS };
      this.initializeDefaultState();
      callback();
      return;
    }

    chrome.storage.local.get(Object.values(this.KEYS), (result) => {
      if (chrome.runtime.lastError) {
        console.error("WebIn Error: Failed to load state.", chrome.runtime.lastError);
        result = {};
      }
      this.settings = { ...this.DEFAULT_SETTINGS, ...(result[this.KEYS.settings] || {}) };
      this.usage = result[this.KEYS.usage] || {};
      this.lastTab = result[this.KEYS.lastTab] || null;
      this.updatedAt = result[this.KEYS.updated] || 0;

      const tabs = result[this.KEYS.tabs];
      const content = result[this.KEYS.content];
      if (tabs && content && this.isValidData(tabs, content)) {
        this.tabs = tabs;
        this.tabContent = content;
      } else {
        if (tabs || content) console.error("WebIn Error: Corrupt data in storage. Resetting.");
        this.initializeDefaultState();
      }

      if (this.settings.syncEnabled) {
        this.pullSync().then(() => callback());
      } else {
        callback();
      }
    });
  },

  resetState(callback) {
    if (!this.hasStorage()) return;
    const keepSettings = this.settings;
    chrome.storage.local.clear(() => {
      this.usage = {};
      this.lastTab = null;
      this.settings = keepSettings || { ...this.DEFAULT_SETTINGS };
      this.settings.defaultTab = "";
      this.saveSettings();
      this.initializeDefaultState();
      if (callback) callback();
    });
  },

  // Replace all categories/apps (used by import).
  replaceData(tabs, tabContent) {
    const clean = this.sanitizeData(tabs, tabContent);
    this.tabs = clean.tabs;
    this.tabContent = clean.tabContent;
    this.saveState();
  },

  exportData() {
    return {
      app: "WebIn",
      version: 2,
      exportedAt: new Date().toISOString(),
      tabs: this.tabs,
      tabContent: this.tabContent,
      settings: this.settings,
    };
  },

  // ============== Notes & To-do ==============
  loadNotes(callback) {
    if (!this.hasStorage()) return callback({ text: "", todos: [] });
    chrome.storage.local.get([this.KEYS.notes], (r) => {
      const n = r[this.KEYS.notes] || {};
      callback({ text: n.text || "", todos: Array.isArray(n.todos) ? n.todos : [] });
    });
  },

  saveNotes(notes) {
    if (this.hasStorage()) chrome.storage.local.set({ [this.KEYS.notes]: notes });
  },

  // ============== Cross-device sync (chrome.storage.sync) ==============
  _syncTimer: null,

  scheduleSyncPush() {
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this.pushSync(), 1500);
  },

  pushSync() {
    return new Promise((resolve) => {
      if (!chrome.storage.sync) return resolve({ ok: false, error: "Sync storage not available" });
      const json = JSON.stringify({ tabs: this.tabs, tabContent: this.tabContent });
      const chunks = [];
      for (let i = 0; i < json.length; i += this.SYNC_CHUNK) {
        chunks.push(json.slice(i, i + this.SYNC_CHUNK));
      }
      if (chunks.length > 45) {
        return resolve({
          ok: false,
          error: "Too much data for browser sync (limit ~80 KB). Use Export instead.",
        });
      }
      const data = {
        [this.SYNC_PREFIX + "meta"]: { chunks: chunks.length, updatedAt: this.updatedAt || Date.now() },
      };
      chunks.forEach((c, i) => (data[this.SYNC_PREFIX + i] = c));
      chrome.storage.sync.get(null, (existing) => {
        const stale = Object.keys(existing || {}).filter(
          (k) => k.startsWith(this.SYNC_PREFIX) && !(k in data)
        );
        const write = () =>
          chrome.storage.sync.set(data, () => {
            const err = chrome.runtime.lastError;
            if (err) console.error("[WebIn] Sync push failed", err);
            resolve(err ? { ok: false, error: err.message } : { ok: true });
          });
        if (stale.length) chrome.storage.sync.remove(stale, write);
        else write();
      });
    });
  },

  // Adopt synced data if it is newer than the local copy.
  pullSync() {
    return new Promise((resolve) => {
      if (!chrome.storage.sync) return resolve(false);
      chrome.storage.sync.get(null, (all) => {
        if (chrome.runtime.lastError || !all) return resolve(false);
        const meta = all[this.SYNC_PREFIX + "meta"];
        if (!meta || !meta.chunks) return resolve(false);
        if (meta.updatedAt <= this.updatedAt) return resolve(false);
        try {
          let json = "";
          for (let i = 0; i < meta.chunks; i++) json += all[this.SYNC_PREFIX + i] || "";
          const data = JSON.parse(json);
          if (!this.isValidData(data.tabs, data.tabContent)) return resolve(false);
          const clean = this.sanitizeData(data.tabs, data.tabContent);
          this.tabs = clean.tabs;
          this.tabContent = clean.tabContent;
          this.updatedAt = meta.updatedAt;
          chrome.storage.local.set({
            [this.KEYS.tabs]: this.tabs,
            [this.KEYS.content]: this.tabContent,
            [this.KEYS.updated]: this.updatedAt,
          });
          resolve(true);
        } catch (e) {
          console.error("[WebIn] Sync data unreadable", e);
          resolve(false);
        }
      });
    });
  },

  getFaviconUrl(url, customIcon = null) {
    if (customIcon && customIcon.trim() !== "") {
      return customIcon;
    }
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
  },

  // Fetch icon via background script to bypass CSP
  async fetchIconViaBackground(url) {
    if (this.iconCache.has(url)) {
      return this.iconCache.get(url);
    }
    const response = await WebInUtil.send({ action: "fetchIcon", url });
    if (response && response.dataUrl) {
      this.iconCache.set(url, response.dataUrl);
      return response.dataUrl;
    }
    return null;
  },
};
