// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// settings.js -- Settings panel, Notes & To-do, Backup / Import
// ===========================================================
//   - WebInSettings.render(container, ctx) : builds the settings panel. Used
//     both as a modal in the overlay and as the full options page.
//       Appearance : theme (auto / retro / dark / ocean / forest)
//       Behaviour  : open links in new / same tab, default category,
//                    show "Most used" row
//       Shortcut   : shows current shortcut, opens the browser's shortcut page
//       Sync       : chrome.storage.sync on/off + "Sync now"
//       Backup     : export JSON, import JSON, import from bookmarks
//       Danger     : reset everything
//   - WebInNotes.show(shadow) : notes text area + to-do list (auto-saved).
//
// ctx = { shadow, onThemeChanged(), onDataChanged(), standalone }
// ----------------------------------------------------------------------------

const WebInSettings = {
  show(shadow, ctx) {
    const { modal, close } = WebInModals.createShell(shadow, { wide: true });
    this.render(modal, { ...ctx, shadow, close });
  },

  render(container, ctx) {
    const esc = WebInUtil.escapeHtml;
    const s = WebInState.settings;
    const opt = (value, label, current) =>
      `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(label)}</option>`;

    container.innerHTML = `
      <p class="modal-title">Settings</p>

      <div class="settings-section">
        <h4>Appearance</h4>
        <div class="settings-row">
          <label>Theme</label>
          <select class="modal-select" data-s="theme">
            ${opt("auto", "Auto (match system)", s.theme)}
            ${opt("retro", "Retro (classic)", s.theme)}
            ${opt("dark", "Dark", s.theme)}
            ${opt("ocean", "Ocean", s.theme)}
            ${opt("forest", "Forest", s.theme)}
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h4>Behaviour</h4>
        <div class="settings-row">
          <label>Clicking an app opens it in</label>
          <select class="modal-select" data-s="openMode">
            ${opt("newtab", "A new tab", s.openMode)}
            ${opt("sametab", "The current tab", s.openMode)}
          </select>
        </div>
        <div class="settings-row">
          <label>Category shown on open</label>
          <select class="modal-select" data-s="defaultTab">
            ${opt("", "Last used", s.defaultTab)}
            ${WebInState.tabs.map((t) => opt(t, t, s.defaultTab)).join("")}
          </select>
        </div>
        <div class="settings-row">
          <label for="s-freq">Show "Most used" row</label>
          <input type="checkbox" id="s-freq" data-s="showFrequent" ${s.showFrequent ? "checked" : ""}>
        </div>
        <p class="settings-note">Ctrl/⌘+click = new tab · Middle-click = background tab · Shift+click = new window</p>
      </div>

      <div class="settings-section">
        <h4>Keyboard shortcut</h4>
        <div class="settings-row">
          <label>Open WebIn: <b data-s="shortcut">…</b></label>
          <button class="mini-btn" data-a="shortcuts">Change</button>
        </div>
        <p class="settings-note">Inside WebIn: ↑↓←→ select · Enter open · Tab / Shift+Tab switch category · Alt+1–9 jump to category · Esc close · type “&gt;” to search open tabs, “?” to search the web.</p>
      </div>

      <div class="settings-section">
        <h4>Sync across devices</h4>
        <div class="settings-row">
          <label for="s-sync">Sync apps & categories with your browser account</label>
          <input type="checkbox" id="s-sync" data-s="syncEnabled" ${s.syncEnabled ? "checked" : ""}>
        </div>
        <div class="settings-row">
          <span class="settings-note" data-s="syncStatus">Uses the browser's built-in sync (Chrome / Brave Sync must be on). Max ~80 KB.</span>
          <button class="mini-btn" data-a="syncNow">Sync now</button>
        </div>
      </div>

      <div class="settings-section">
        <h4>Backup & import</h4>
        <div class="settings-actions">
          <button class="mini-btn" data-a="export">Export (JSON)</button>
          <button class="mini-btn" data-a="import">Import (JSON)</button>
          <button class="mini-btn" data-a="bookmarks">Import from bookmarks</button>
          <input type="file" accept=".json,application/json" data-a="file" style="display:none">
        </div>
        <p class="settings-note" data-s="backupStatus">Export a backup, or move your links between Chrome and Brave.</p>
      </div>

      <div class="settings-section">
        <h4>Danger zone</h4>
        <div class="settings-actions">
          <button class="mini-btn danger" data-a="reset">Reset everything</button>
        </div>
      </div>

      <div class="modal-footer"></div>
    `;

    const $ = (sel) => container.querySelector(sel);
    const status = (key, text, ok = true) => {
      const el = $(`[data-s="${key}"]`);
      el.textContent = text;
      el.classList.toggle("status-ok", ok);
      el.classList.toggle("status-err", !ok);
    };

    // ---- Settings fields ----
    $('[data-s="theme"]').onchange = (e) => {
      s.theme = e.target.value;
      WebInState.saveSettings();
      ctx.onThemeChanged && ctx.onThemeChanged();
    };
    $('[data-s="openMode"]').onchange = (e) => {
      s.openMode = e.target.value;
      WebInState.saveSettings();
    };
    $('[data-s="defaultTab"]').onchange = (e) => {
      s.defaultTab = e.target.value;
      WebInState.saveSettings();
    };
    $('[data-s="showFrequent"]').onchange = (e) => {
      s.showFrequent = e.target.checked;
      WebInState.saveSettings();
      ctx.onDataChanged && ctx.onDataChanged();
    };

    // ---- Shortcut ----
    WebInUtil.send({ action: "getShortcut" }).then((res) => {
      $('[data-s="shortcut"]').textContent = (res && res.shortcut) || "not set";
    });
    $('[data-a="shortcuts"]').onclick = () => WebInUtil.send({ action: "openShortcuts" });

    // ---- Sync ----
    const doSync = async () => {
      status("syncStatus", "Syncing…");
      const pulled = await WebInState.pullSync();
      if (pulled) ctx.onDataChanged && ctx.onDataChanged();
      const res = await WebInState.pushSync();
      if (res.ok) status("syncStatus", pulled ? "Pulled newer data and synced ✓" : "Synced ✓");
      else status("syncStatus", res.error || "Sync failed", false);
    };
    $('[data-s="syncEnabled"]').onchange = (e) => {
      s.syncEnabled = e.target.checked;
      WebInState.saveSettings();
      if (s.syncEnabled) doSync();
      else status("syncStatus", "Sync is off. Data stays on this device.");
    };
    $('[data-a="syncNow"]').onclick = doSync;

    // ---- Export / import ----
    $('[data-a="export"]').onclick = () => {
      const date = new Date().toISOString().slice(0, 10);
      WebInUtil.downloadText(`webin-backup-${date}.json`, JSON.stringify(WebInState.exportData(), null, 2));
      status("backupStatus", "Backup downloaded ✓");
    };
    const fileInput = $('[data-a="file"]');
    $('[data-a="import"]').onclick = () => fileInput.click();
    fileInput.onchange = () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) return status("backupStatus", "File too large.", false);
      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try {
          data = JSON.parse(reader.result);
        } catch (e) {
          return status("backupStatus", "That file is not valid JSON.", false);
        }
        if (!data || !WebInState.isValidData(data.tabs, data.tabContent)) {
          return status("backupStatus", "That file is not a WebIn backup.", false);
        }
        WebInModals.showModal(ctx.shadow, {
          type: "confirm",
          title: "Replace your data?",
          message: `Import ${data.tabs.length} categories? This replaces all your current categories and apps.`,
          primaryActionText: "Import",
          onConfirm: (ok) => {
            if (!ok) return;
            WebInState.replaceData(data.tabs, data.tabContent);
            if (data.settings && typeof data.settings === "object") {
              const keep = WebInState.settings.syncEnabled;
              WebInState.settings = { ...WebInState.DEFAULT_SETTINGS, ...data.settings, syncEnabled: keep };
              WebInState.saveSettings();
              ctx.onThemeChanged && ctx.onThemeChanged();
            }
            ctx.onDataChanged && ctx.onDataChanged();
            status("backupStatus", `Imported ${WebInState.tabs.length} categories ✓`);
          },
        });
      };
      reader.readAsText(file);
    };

    $('[data-a="bookmarks"]').onclick = () => this.showBookmarkImport(ctx);

    // ---- Reset ----
    $('[data-a="reset"]').onclick = () => {
      WebInModals.showModal(ctx.shadow, {
        type: "confirm",
        title: "Reset Extension?",
        message: "All your custom categories and links will be permanently deleted.",
        primaryActionText: "Yes, Reset",
        onConfirm: (ok) => {
          if (!ok) return;
          WebInState.resetState(() => {
            ctx.onDataChanged && ctx.onDataChanged();
            WebInModals.alert(ctx.shadow, "Reset Complete", "The extension has been reset.");
          });
        },
      });
    };

    // ---- Footer ----
    const footer = $(".modal-footer");
    if (!ctx.standalone) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "modal-button primary";
      closeBtn.textContent = "Done";
      closeBtn.onclick = () => ctx.close();
      footer.appendChild(closeBtn);
    } else {
      footer.innerHTML = `<span class="settings-note">Changes are saved automatically.</span>`;
    }
  },

  // ============== Import from bookmarks ==============
  async showBookmarkImport(ctx) {
    const res = await WebInUtil.send({ action: "getBookmarkFolders" });
    const folders = (res && res.folders) || [];
    const esc = WebInUtil.escapeHtml;
    const { modal, close } = WebInModals.createShell(ctx.shadow, { wide: true, stack: true });

    modal.innerHTML = `
      <p class="modal-title">Import from bookmarks</p>
      <p class="modal-message">Each selected folder becomes a new category.</p>
      <div data-list style="display:flex; flex-direction:column; gap:4px; max-height:300px; overflow-y:auto;">
        ${
          folders.length
            ? folders
                .map(
                  (f, i) => `
          <label class="todo-item" style="cursor:pointer;">
            <input type="checkbox" data-i="${i}">
            <span>${esc(f.path)}</span>
            <span class="settings-note">${f.items.length} links</span>
          </label>`
                )
                .join("")
            : `<p class="settings-note">${res ? "No bookmark folders with links found." : "Couldn't read bookmarks. Reload the extension so it gets the bookmarks permission."}</p>`
        }
      </div>
      <div class="modal-footer"></div>
    `;

    const footer = modal.querySelector(".modal-footer");
    const cancel = document.createElement("button");
    cancel.className = "modal-button secondary";
    cancel.textContent = "Cancel";
    cancel.onclick = close;
    const go = document.createElement("button");
    go.className = "modal-button primary";
    go.textContent = "Import selected";
    go.onclick = () => {
      const picked = Array.from(modal.querySelectorAll("input[data-i]:checked")).map(
        (c) => folders[Number(c.dataset.i)]
      );
      if (!picked.length) return;
      let count = 0;
      picked.forEach((f) => {
        const name = WebInTabs.uniqueName(f.title || "Bookmarks");
        const clean = WebInState.sanitizeData([name], { [name]: f.items });
        WebInState.tabs.push(name);
        WebInState.tabContent[name] = clean.tabContent[name] || [];
        count += WebInState.tabContent[name].length;
      });
      WebInState.saveState();
      close();
      ctx.onDataChanged && ctx.onDataChanged();
      WebInModals.alert(ctx.shadow, "Imported", `Added ${picked.length} categories with ${count} links.`);
    };
    footer.appendChild(cancel);
    footer.appendChild(go);
  },
};

// ============== Notes & To-do ==============
const WebInNotes = {
  show(shadow) {
    const { modal, close } = WebInModals.createShell(shadow, { wide: true });
    modal.innerHTML = `
      <p class="modal-title">Notes & To-do</p>
      <div class="settings-section">
        <h4>To-do</h4>
        <div class="todo-add">
          <input type="text" class="modal-input" data-n="new" placeholder="Add a task and press Enter">
        </div>
        <div class="todo-list" data-n="list"></div>
      </div>
      <div class="settings-section">
        <h4>Notes</h4>
        <textarea class="notes-area" data-n="text" placeholder="Quick notes… (saved automatically)"></textarea>
      </div>
      <div class="modal-footer"></div>
    `;

    const $ = (k) => modal.querySelector(`[data-n="${k}"]`);
    const doneBtn = document.createElement("button");
    doneBtn.className = "modal-button primary";
    doneBtn.textContent = "Done";
    doneBtn.onclick = close;
    modal.querySelector(".modal-footer").appendChild(doneBtn);

    WebInState.loadNotes((notes) => {
      let timer = null;
      const save = () => WebInState.saveNotes(notes);

      const textArea = $("text");
      textArea.value = notes.text;
      textArea.addEventListener("input", () => {
        notes.text = textArea.value;
        clearTimeout(timer);
        timer = setTimeout(save, 400);
      });

      const list = $("list");
      const renderTodos = () => {
        list.innerHTML = "";
        if (!notes.todos.length) {
          const p = document.createElement("p");
          p.className = "settings-note";
          p.textContent = "Nothing to do 🎉";
          list.appendChild(p);
        }
        notes.todos.forEach((todo) => {
          const row = document.createElement("label");
          row.className = "todo-item" + (todo.done ? " done" : "");
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = !!todo.done;
          cb.onchange = () => {
            todo.done = cb.checked;
            save();
            renderTodos();
          };
          const span = document.createElement("span");
          span.textContent = todo.text;
          const del = document.createElement("button");
          del.textContent = "×";
          del.title = "Remove";
          del.onclick = (e) => {
            e.preventDefault();
            notes.todos = notes.todos.filter((t) => t !== todo);
            save();
            renderTodos();
          };
          row.appendChild(cb);
          row.appendChild(span);
          row.appendChild(del);
          list.appendChild(row);
        });
        if (notes.todos.some((t) => t.done)) {
          const clear = document.createElement("button");
          clear.className = "mini-btn";
          clear.textContent = "Clear completed";
          clear.style.alignSelf = "flex-start";
          clear.onclick = () => {
            notes.todos = notes.todos.filter((t) => !t.done);
            save();
            renderTodos();
          };
          list.appendChild(clear);
        }
      };
      renderTodos();

      const input = $("new");
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const text = input.value.trim();
        if (!text) return;
        notes.todos.push({ id: Date.now(), text: text.slice(0, 200), done: false });
        input.value = "";
        save();
        renderTodos();
      });
      setTimeout(() => input.focus(), 50);
    });
  },
};
