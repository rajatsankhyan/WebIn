// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
//
// tabs.js -- Tab and Category Management
// ===========================================================
//   - setActiveTab()     : switch category, remember it as "last used".
//   - createTabButton()  : category button (click, double-click to rename,
//                          drag to reorder, delete in delete mode).
//   - addCategory()      : add a new category (duplicate-safe).
//   - renameCategory()   : rename a category and keep its apps.
//   - cycleTab()         : next / previous category (Tab / Shift+Tab).
//   - toggleDeleteMode() : category delete mode.
// ----------------------------------------------------------------------------

const WebInTabs = {
  _dragFrom: null,

  setActiveTab(tabName) {
    if (WebInState.isDeleteMode) return;

    WebInUI.currentTab = tabName || null;
    WebInUI.navTabsContainer.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", !!tabName && btn.dataset.name === tabName);
    });
    if (tabName) {
      WebInState.saveLastTab(tabName);
      const active = WebInUI.navTabsContainer.querySelector("button.active");
      if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    WebInUI.renderContent();
  },

  rebuildNav() {
    WebInUI.navTabsContainer.innerHTML = "";
    WebInState.tabs.forEach((tab) => WebInUI.navTabsContainer.appendChild(this.createTabButton(tab)));
  },

  cycleTab(step) {
    const tabs = WebInState.tabs;
    if (!tabs.length) return;
    const i = tabs.indexOf(WebInUI.currentTab);
    const next = tabs[(i + step + tabs.length) % tabs.length];
    WebInUI.searchInput.value = "";
    this.setActiveTab(next);
  },

  goToIndex(i) {
    if (i < WebInState.tabs.length) {
      WebInUI.searchInput.value = "";
      this.setActiveTab(WebInState.tabs[i]);
    }
  },

  createTabButton(tabName) {
    const button = document.createElement("button");
    button.textContent = tabName;
    button.dataset.name = tabName;
    button.title = "Double-click to rename · drag to reorder";
    button.draggable = true;

    button.onclick = () => {
      if (WebInState.isDeleteMode) {
        WebInModals.showModal(WebInUI.shadow, {
          type: "confirm",
          title: "Delete Category",
          message: `Are you sure you want to delete "${tabName}"? All links inside will be lost.`,
          primaryActionText: "Yes, Delete",
          onConfirm: (confirmed) => {
            if (!confirmed) return;
            delete WebInState.tabContent[tabName];
            WebInState.tabs.splice(WebInState.tabs.indexOf(tabName), 1);
            if (WebInState.settings.defaultTab === tabName) {
              WebInState.settings.defaultTab = "";
              WebInState.saveSettings();
            }
            WebInState.saveState();
            button.remove();
            this.toggleDeleteMode(false);
            if (WebInUI.currentTab === tabName) {
              this.setActiveTab(WebInState.tabs.length > 0 ? WebInState.tabs[0] : null);
            }
          },
        });
      } else {
        if (WebInUI.currentTab === tabName && WebInUI.searchInput.value === "") return;
        WebInUI.searchInput.value = "";
        this.setActiveTab(tabName);
      }
    };

    button.ondblclick = () => {
      if (WebInState.isDeleteMode) return;
      WebInModals.showModal(WebInUI.shadow, {
        type: "prompt",
        title: "Rename Category",
        message: `New name for "${tabName}":`,
        defaultValue: tabName,
        primaryActionText: "Rename",
        onConfirm: (val) => val && this.renameCategory(tabName, val),
      });
    };

    // Drag to reorder
    button.addEventListener("dragstart", (e) => {
      this._dragFrom = tabName;
      button.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", tabName);
    });
    button.addEventListener("dragend", () => {
      this._dragFrom = null;
      WebInUI.navTabsContainer
        .querySelectorAll(".dragging, .drag-over")
        .forEach((el) => el.classList.remove("dragging", "drag-over"));
    });
    button.addEventListener("dragover", (e) => {
      if (this._dragFrom === null || this._dragFrom === tabName) return;
      e.preventDefault();
      button.classList.add("drag-over");
    });
    button.addEventListener("dragleave", () => button.classList.remove("drag-over"));
    button.addEventListener("drop", (e) => {
      if (this._dragFrom === null) return;
      e.preventDefault();
      const tabs = WebInState.tabs;
      const from = tabs.indexOf(this._dragFrom);
      tabs.splice(from, 1);
      tabs.splice(tabs.indexOf(tabName), 0, this._dragFrom);
      this._dragFrom = null;
      WebInState.saveState();
      this.rebuildNav();
      this.setActiveTab(WebInUI.currentTab);
    });

    return button;
  },

  addCategory(newCategoryName) {
    const trimmedName = newCategoryName.trim().slice(0, 60);
    if (!trimmedName) return;
    if (Object.prototype.hasOwnProperty.call(WebInState.tabContent, trimmedName)) {
      WebInModals.alert(WebInUI.shadow, "Error", "A category with this name already exists.");
      return;
    }

    WebInState.tabContent[trimmedName] = [];
    WebInState.tabs.push(trimmedName);
    WebInState.saveState();

    WebInUI.navTabsContainer.appendChild(this.createTabButton(trimmedName));
    WebInUI.searchInput.value = "";
    this.setActiveTab(trimmedName);
  },

  // Unique category name (used by bookmark import)
  uniqueName(base) {
    let name = base.trim().slice(0, 60) || "Imported";
    let n = 2;
    while (Object.prototype.hasOwnProperty.call(WebInState.tabContent, name)) name = `${base} (${n++})`;
    return name;
  },

  renameCategory(oldName, newNameRaw) {
    const newName = newNameRaw.trim().slice(0, 60);
    if (!newName || newName === oldName) return;
    if (Object.prototype.hasOwnProperty.call(WebInState.tabContent, newName)) {
      WebInModals.alert(WebInUI.shadow, "Error", "A category with this name already exists.");
      return;
    }
    const i = WebInState.tabs.indexOf(oldName);
    WebInState.tabs[i] = newName;
    WebInState.tabContent[newName] = WebInState.tabContent[oldName];
    delete WebInState.tabContent[oldName];
    if (WebInState.settings.defaultTab === oldName) {
      WebInState.settings.defaultTab = newName;
      WebInState.saveSettings();
    }
    WebInState.saveState();
    this.rebuildNav();
    this.setActiveTab(WebInUI.currentTab === oldName ? newName : WebInUI.currentTab);
  },

  toggleDeleteMode(force) {
    WebInState.isDeleteMode = typeof force === "boolean" ? force : !WebInState.isDeleteMode;
    const nav = WebInUI.shadow.querySelector(".nav");
    const deleteBtn = WebInUI.shadow.querySelector(".delete-mode-btn");
    nav.classList.toggle("delete-mode", WebInState.isDeleteMode);
    deleteBtn.classList.toggle("active", WebInState.isDeleteMode);
  },
};

WebInUI.setActiveTab = WebInTabs.setActiveTab.bind(WebInTabs);
WebInUI.createTabButton = WebInTabs.createTabButton.bind(WebInTabs);
