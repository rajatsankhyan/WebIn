// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
//
// modals.js -- Modal Dialog System
// ===========================================================
// Reusable modal dialogs rendered inside the Shadow DOM:
//   - showModal        : alert / confirm / prompt.
//   - showAppModal     : add or edit an app (name, URL, icon, category).
//   - showAddAppModal  : wrapper for adding (optionally pre-filled).
//   - showEditAppModal : wrapper for editing / deleting / moving an app.
//   - createShell      : empty modal used by settings, notes, etc.
//
// Security: every piece of user-provided text is escaped before it is put
// into innerHTML, and URLs are validated (http/https only).
// Escape closes the top modal (handled in events.js via _webinCancel).
// ----------------------------------------------------------------------------

const WebInModals = {
  // Empty modal shell. Returns { backdrop, modal, close }.
  // stack=true keeps any open modal underneath (used for alerts/confirms).
  createShell(shadow, { wide = false, onCancel = null, stack = false } = {}) {
    if (!stack) shadow.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = wide ? "modal wide" : "modal";
    backdrop.appendChild(modal);

    const close = () => backdrop.remove();
    backdrop._webinCancel = () => {
      if (onCancel) onCancel();
      close();
    };
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop._webinCancel();
    });
    shadow.appendChild(backdrop);
    return { backdrop, modal, close };
  },

  showModal(shadow, config) {
    const {
      type,
      title,
      message,
      placeholder = "",
      defaultValue = "",
      primaryActionText = "Confirm",
      onConfirm,
      onCancel,
    } = config;
    const esc = WebInUtil.escapeHtml;

    const { backdrop, modal, close } = this.createShell(shadow, {
      stack: true,
      onCancel: () => {
        if (onCancel) onCancel();
        if (onConfirm && type === "confirm") onConfirm(false);
      },
    });

    modal.innerHTML = `
      <p class="modal-title">${esc(title)}</p>
      <p class="modal-message">${esc(message)}</p>
      ${type === "prompt" ? `<input type="text" class="modal-input" placeholder="${esc(placeholder)}" value="${esc(defaultValue)}">` : ""}
      <div class="modal-footer"></div>
    `;

    const footer = modal.querySelector(".modal-footer");

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = type === "alert" ? "OK" : "Cancel";
    cancelBtn.className = "modal-button secondary";
    cancelBtn.onclick = () => backdrop._webinCancel();
    footer.appendChild(cancelBtn);

    if (type === "prompt" || type === "confirm") {
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = primaryActionText;
      confirmBtn.className = "modal-button primary";
      confirmBtn.onclick = () => {
        close();
        if (onConfirm) {
          onConfirm(type === "prompt" ? modal.querySelector(".modal-input").value : true);
        }
      };
      footer.appendChild(confirmBtn);

      if (type === "prompt") {
        const inputField = modal.querySelector(".modal-input");
        setTimeout(() => inputField.focus(), 50);
        inputField.addEventListener("keydown", (e) => {
          if (e.key === "Enter") confirmBtn.click();
        });
      } else {
        setTimeout(() => confirmBtn.focus(), 50);
      }
    } else {
      setTimeout(() => cancelBtn.focus(), 50);
    }
  },

  alert(shadow, title, message) {
    this.showModal(shadow, { type: "alert", title, message });
  },

  // Generic add/edit form.
  // opts: { title, initial:{name,url,icon}, category, saveText, onSave(app, category), onDelete }
  showAppModal(shadow, opts) {
    const esc = WebInUtil.escapeHtml;
    const initial = opts.initial || {};
    const { modal, close } = this.createShell(shadow);

    const categoryOptions = WebInState.tabs
      .map(
        (t) =>
          `<option value="${esc(t)}" ${t === opts.category ? "selected" : ""}>${esc(t)}</option>`
      )
      .join("");

    modal.innerHTML = `
      <p class="modal-title">${esc(opts.title)}</p>
      <div class="modal-form-group">
        <label>Name</label>
        <input type="text" class="modal-input" data-f="name" placeholder="e.g., Google" value="${esc(initial.name || "")}">
      </div>
      <div class="modal-form-group">
        <label>URL</label>
        <input type="text" class="modal-input" data-f="url" placeholder="https://google.com" value="${esc(initial.url || "")}">
      </div>
      <div class="modal-form-group">
        <label>Icon URL (optional)</label>
        <input type="text" class="modal-input" data-f="icon" placeholder="Leave empty for auto favicon" value="${esc(initial.icon || "")}">
      </div>
      <div class="modal-form-group">
        <label>Category</label>
        <select class="modal-select" data-f="category">${categoryOptions}</select>
      </div>
      <p class="settings-note status-err" data-f="error"></p>
      <div class="modal-footer"></div>
    `;

    const field = (n) => modal.querySelector(`[data-f="${n}"]`);
    const footer = modal.querySelector(".modal-footer");
    footer.style.justifyContent = "space-between";

    const left = document.createElement("div");
    const right = document.createElement("div");
    right.style.cssText = "display:flex; gap:10px; margin-left:auto;";

    if (opts.onDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "modal-button danger";
      deleteBtn.onclick = () => {
        this.showModal(shadow, {
          type: "confirm",
          title: "Delete App?",
          message: `Are you sure you want to delete "${initial.name}"?`,
          primaryActionText: "Yes, Delete",
          onConfirm: (ok) => {
            if (!ok) return;
            close();
            opts.onDelete();
          },
        });
      };
      left.appendChild(deleteBtn);
    }

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "modal-button secondary";
    cancelBtn.onclick = close;

    const saveBtn = document.createElement("button");
    saveBtn.textContent = opts.saveText || "Save";
    saveBtn.className = "modal-button primary";
    saveBtn.onclick = () => {
      const name = field("name").value.trim();
      const url = WebInUtil.normalizeUrl(field("url").value);
      const iconRaw = field("icon").value.trim();
      const icon = iconRaw ? WebInUtil.normalizeUrl(iconRaw) : null;
      const category = field("category").value;
      const err = field("error");

      if (!name) return (err.textContent = "Please enter a name.");
      if (!url) return (err.textContent = "Please enter a valid http(s) URL.");
      if (iconRaw && !icon) return (err.textContent = "Icon must be a valid http(s) URL.");
      if (!category) return (err.textContent = "Create a category first.");

      const app = { name: name.slice(0, 80), url };
      if (icon) app.icon = icon;
      close();
      opts.onSave(app, category);
    };

    right.appendChild(cancelBtn);
    right.appendChild(saveBtn);
    footer.appendChild(left);
    footer.appendChild(right);

    modal.querySelectorAll("input").forEach((inp) =>
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveBtn.click();
      })
    );
    setTimeout(() => field(initial.name ? "url" : "name").focus(), 50);
  },

  showAddAppModal(shadow, categoryName, onSave, prefill = null) {
    this.showAppModal(shadow, {
      title: prefill ? "Add This Page" : "Add App",
      initial: prefill || {},
      category: categoryName,
      saveText: "Add App",
      onSave,
    });
  },

  showEditAppModal(shadow, item, categoryName, onSave, onDelete) {
    this.showAppModal(shadow, {
      title: "Edit App",
      initial: item,
      category: categoryName,
      saveText: "Save",
      onSave,
      onDelete,
    });
  },
};
