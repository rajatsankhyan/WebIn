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
// background.js -- Extension Service Worker
// ===========================================================
// Background service worker for the WebIn Chrome Extension. Handles:
//   - Keyboard shortcut commands to toggle the overlay on any page.
//   - Icon fetching and caching via fetch API to bypass CSP restrictions.
//   - Popup window fallback for restricted pages (chrome://, edge://, etc.)
//     where content script injection is not allowed.
//   - Message routing between popup/content scripts and the service worker:
//     opening links (new/same/background tab, new window), "Open all" as a
//     tab group, listing/switching open tabs, active-tab info for
//     "Add current page", bookmark folders for import, shortcut info.
//
// Toggle flow:
//   1. On shortcut press, checks if the active tab is a restricted URL.
//   2. For restricted URLs, opens/closes a standalone popup window.
//   3. For normal URLs, sends a toggle message to the content script.
//   4. If no content script is injected yet, injects all WebIn scripts.
// ----------------------------------------------------------------------------

// ============== WebIn Background Service Worker ==============

console.log(
  "%c[WebIn] Service Worker Loaded",
  "color: #4caf50; font-weight: bold; font-size: 14px;",
);

// ============== Icon Cache for WebIn Overlay ==============
const iconCache = new Map();

// Fetch icon and convert to base64 data URL
async function fetchIconAsDataUrl(url) {
  if (iconCache.has(url)) {
    return iconCache.get(url);
  }

  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Fetch failed");

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        iconCache.set(url, dataUrl);
        resolve(dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("[WebIn] Icon fetch failed:", url, error);
    return null;
  }
}

// ============== Helpers for overlay actions ==============
const EXT_ORIGIN = chrome.runtime.getURL("");

// The tab the user is "on": the page itself for content scripts, or the
// active tab of the last focused normal window for the popup/options pages.
async function getContextTab(sender) {
  if (sender.tab && !(sender.url || "").startsWith(EXT_ORIGIN)) return sender.tab;
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
    return tab || null;
  } catch (e) {
    return null;
  }
}

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

async function openUrl(url, mode, sender) {
  if (!isHttpUrl(url)) return { ok: false };
  if (mode === "newwindow") {
    await chrome.windows.create({ url, focused: true });
    return { ok: true };
  }
  const tab = await getContextTab(sender);
  if (!tab) {
    await chrome.windows.create({ url, focused: true });
    return { ok: true };
  }
  if (mode === "sametab") {
    await chrome.tabs.update(tab.id, { url });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({
      url,
      windowId: tab.windowId,
      index: tab.index + 1,
      active: mode !== "background",
    });
    if (mode !== "background") await chrome.windows.update(tab.windowId, { focused: true });
  }
  return { ok: true };
}

// Workspace: open all links of a category as one tab group
async function openAll(urls, title, sender) {
  const safe = (urls || []).filter(isHttpUrl).slice(0, 40);
  if (!safe.length) return { ok: false };
  const ctxTab = await getContextTab(sender);
  let windowId = ctxTab ? ctxTab.windowId : undefined;
  if (windowId === undefined) {
    const win = await chrome.windows.create({ focused: true });
    windowId = win.id;
  }
  const tabIds = [];
  for (let i = 0; i < safe.length; i++) {
    const t = await chrome.tabs.create({ url: safe[i], windowId, active: i === 0 });
    tabIds.push(t.id);
  }
  try {
    const groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId } });
    if (chrome.tabGroups) await chrome.tabGroups.update(groupId, { title: String(title || "WebIn").slice(0, 40) });
  } catch (e) {
    console.warn("[WebIn] Tab grouping not available:", e);
  }
  await chrome.windows.update(windowId, { focused: true });
  return { ok: true };
}

async function listTabs() {
  const tabs = await chrome.tabs.query({ windowType: "normal" });
  return {
    tabs: tabs.map((t) => ({
      id: t.id,
      windowId: t.windowId,
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl,
    })),
  };
}

// Flatten bookmark tree into folders that directly contain links
async function getBookmarkFolders() {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  const walk = (node, path) => {
    if (!node.children) return;
    const here = node.title ? (path ? path + " / " + node.title : node.title) : path;
    const items = node.children
      .filter((c) => c.url && isHttpUrl(c.url))
      .map((c) => ({ name: c.title || new URL(c.url).hostname, url: c.url }));
    if (items.length && node.title) folders.push({ title: node.title, path: here, items });
    node.children.forEach((c) => walk(c, here));
  };
  tree.forEach((n) => walk(n, ""));
  return { folders };
}

// ============== Message Listener ==============
const handlers = {
  fetchIcon: (req) => fetchIconAsDataUrl(req.url).then((dataUrl) => ({ dataUrl })),
  openUrl: (req, sender) => openUrl(req.url, req.mode, sender),
  openAll: (req, sender) => openAll(req.urls, req.title, sender),
  listTabs: () => listTabs(),
  switchTab: async (req) => {
    await chrome.tabs.update(req.tabId, { active: true });
    await chrome.windows.update(req.windowId, { focused: true });
    return { ok: true };
  },
  getActiveTab: async (req, sender) => {
    const tab = await getContextTab(sender);
    return { tab: tab ? { title: tab.title, url: tab.url } : null };
  },
  getBookmarkFolders: () => getBookmarkFolders(),
  getShortcut: async () => {
    const cmds = await chrome.commands.getAll();
    const c = cmds.find((x) => x.name === "launch_overlay");
    return { shortcut: (c && c.shortcut) || "" };
  },
  openShortcuts: async () => {
    await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    return { ok: true };
  },
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = request && handlers[request.action];
  if (!handler) return false;
  Promise.resolve()
    .then(() => handler(request, sender))
    .then((res) => sendResponse(res || { ok: true }))
    .catch((err) => {
      console.error("[WebIn]", request.action, err);
      sendResponse({ ok: false, error: String(err && err.message) });
    });
  return true; // async response
});

// ============== WebIn Overlay Command ==============
let popupWindowId = null;

const WEBIN_FILES = [
  "webin/config.js",
  "webin/util.js",
  "webin/state.js",
  "webin/styles.js",
  "webin/styles2.js",
  "webin/styles3.js",
  "webin/styles4.js",
  "webin/modals.js",
  "webin/ui.js",
  "webin/tabs.js",
  "webin/events.js",
  "webin/settings.js",
  "webin/app.js",
  "webin/inject.js",
];

// Pages where content scripts can never run (Chrome, Brave, Edge, Opera, Vivaldi...)
function isRestrictedUrl(url) {
  if (!url) return true;
  return (
    /^(chrome|chrome-extension|chrome-untrusted|brave|edge|opera|vivaldi|about|devtools|view-source|file):/i.test(url) ||
    url.startsWith("https://chrome.google.com/webstore") ||
    url.startsWith("https://chromewebstore.google.com") ||
    url.startsWith("https://microsoftedge.microsoft.com/addons")
  );
}

// Toggle the standalone popup window (fallback for restricted pages)
function togglePopupWindow() {
  if (popupWindowId !== null) {
    chrome.windows.remove(popupWindowId, () => {
      void chrome.runtime.lastError;
      popupWindowId = null;
    });
    return;
  }
  chrome.windows.create(
    {
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 920,
      height: 600,
      focused: true,
    },
    (win) => {
      if (win) popupWindowId = win.id;
    }
  );
}

function toggleOverlay(tab) {
  if (!tab || tab.id === undefined) return togglePopupWindow();

  // tab.url can be undefined on some pages in Brave; pendingUrl covers new tabs
  const tabUrl = tab.url || tab.pendingUrl || "";

  if (isRestrictedUrl(tabUrl)) {
    togglePopupWindow();
    return;
  }

  // Try to send a toggle message to the content script first.
  chrome.tabs.sendMessage(tab.id, { action: "webin_toggle" }, () => {
    if (!chrome.runtime.lastError) return;
    // Content script not yet injected, inject it now
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: WEBIN_FILES })
      .catch((err) => {
        // Injection blocked (internal page, PDF viewer, store page, etc.)
        console.warn("[WebIn] Injection failed, using popup window:", err);
        togglePopupWindow();
      });
  });
}

// Keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command !== "launch_overlay") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    toggleOverlay(tabs[0]);
  });
});

// Toolbar icon click
chrome.action.onClicked.addListener((tab) => toggleOverlay(tab));

// Clean up popup window ID when the window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

