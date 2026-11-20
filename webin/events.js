// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
//
// events.js -- Event Handlers and User Interactions
// ===========================================================
//   - Search input (live filtering / command palette).
//   - Keyboard navigation:
//       Arrows        move selection          Enter      open selected
//       Ctrl+Enter    open in new tab         Shift+Enter open in new window
//       Tab/Shift+Tab next / previous category Alt+1..9  jump to category
//       Esc           clear search / close modal / close overlay
//       Typing anywhere focuses the search box.
//   - Drag-to-move and SE-corner resize of the floating overlay.
//   - Add / edit / move app flows and "Add current page".
// ----------------------------------------------------------------------------

const WebInEvents = {
  setupSearchEvents() {
    WebInUI.searchInput.addEventListener("input", () => {
      const query = WebInUI.searchInput.value.trim();
      if (query) {
        WebInUI.navTabsContainer
          .querySelectorAll("button")
          .forEach((btn) => btn.classList.remove("active"));
        WebInUI.renderSearchResults(query);
      } else {
        WebInUI.setActiveTab(WebInUI.currentTab);
      }
    });
  },

  // Keyboard handling for the whole overlay (attached to the wrapper)
  setupKeyboard(wrapper) {
    wrapper.tabIndex = -1;
    wrapper.addEventListener("keydown", (e) => this.handleKey(e));
  },

  handleKey(e) {
    const shadow = WebInUI.shadow;
    const modals = shadow.querySelectorAll(".modal-backdrop");
    const modal = modals[modals.length - 1];
    if (modal) {
      if (e.key === "Escape") {
        e.preventDefault();
        modal._webinCancel();
        if (modals.length === 1) WebInUI.searchInput.focus();
      }
      return; // let modals handle their own keys
    }

    const input = WebInUI.searchInput;
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    const inSearch = target === input;
    const inOtherField =
      !inSearch && target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName || "");
    if (inOtherField) return;
    const query = input.value.trim();

    // Alt+1..9 -> jump to category
    if (e.altKey && !e.ctrlKey && /^Digit[1-9]$/.test(e.code)) {
      e.preventDefault();
      WebInTabs.goToIndex(Number(e.code.slice(5)) - 1);
      input.focus();
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        if (WebInState.isDeleteMode) WebInTabs.toggleDeleteMode(false);
        else if (input.value) {
          input.value = "";
          WebInUI.setActiveTab(WebInUI.currentTab);
          input.focus();
        } else WebInUI.close();
        return;

      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        WebInUI.moveSelection(e.key === "ArrowDown" ? "down" : "up");
        return;

      case "ArrowLeft":
      case "ArrowRight":
        // In the search box, arrows move the caret until you start navigating
        if (inSearch && query && !WebInUI.kbdNav) return;
        e.preventDefault();
        WebInUI.moveSelection(e.key === "ArrowLeft" ? "left" : "right");
        return;

      case "Enter":
        e.preventDefault();
        if (WebInUI.activateSelected(e)) return;
        if (query && !query.startsWith(">")) {
          const q = query.replace(/^\?/, "").trim();
          if (WebInUtil.looksLikeUrl(q)) WebInUtil.open(q, WebInUtil.modeFromEvent(e));
          else if (q)
            WebInUtil.open("https://www.google.com/search?q=" + encodeURIComponent(q), WebInUtil.modeFromEvent(e));
        }
        return;

      case "Tab":
        e.preventDefault();
        WebInTabs.cycleTab(e.shiftKey ? -1 : 1);
        input.focus();
        return;
    }

    // Typing anywhere in the overlay goes to the search box
    if (!inSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      input.focus();
    }
  },

  setupDragAndResize(host, wrapper, header) {
    let isDragging = false,
      isResizing = false,
      offsetX,
      offsetY,
      initialWidth,
      initialHeight,
      initialX,
      initialY;

    header.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      isDragging = true;
      offsetX = e.clientX - host.offsetLeft;
      offsetY = e.clientY - host.offsetTop;
      header.style.cursor = "grabbing";
      e.preventDefault();
    });

    const resizerSE = wrapper.querySelector(".resizer.se");
    resizerSE.addEventListener("mousedown", (e) => {
      isResizing = true;
      initialWidth = wrapper.offsetWidth;
      initialHeight = wrapper.offsetHeight;
      initialX = e.clientX;
      initialY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
    });

    let rafId = null;

    const onMove = (e) => {
      if (!isDragging && !isResizing) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (isDragging) {
          host.style.left = `${e.clientX - offsetX}px`;
          host.style.top = `${e.clientY - offsetY}px`;
        } else if (isResizing) {
          wrapper.style.width = `${Math.max(400, initialWidth + e.clientX - initialX)}px`;
          wrapper.style.height = `${Math.max(300, initialHeight + e.clientY - initialY)}px`;
        }
        rafId = null;
      });
    };

    const onUp = () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = "grab";
      }
      isResizing = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const positionHost = () => {
      host.style.top = `calc(50% - ${wrapper.offsetHeight / 2}px)`;
      host.style.left = `calc(50% - ${wrapper.offsetWidth / 2}px)`;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    window.addEventListener("resize", positionHost);

    // Remove page-level listeners when the overlay goes away
    const cleanup = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      window.removeEventListener("resize", positionHost);
    };
    positionHost.cleanup = cleanup;
    return positionHost;
  },
};

// ============== App add / edit flows ==============
WebInUI.refreshView = function () {
  const q = this.searchInput.value.trim();
  q ? this.renderSearchResults(q) : this.renderContent();
};

WebInUI.showAddAppModal = function (categoryName, prefill = null) {
  if (!WebInState.tabs.length) {
    WebInModals.alert(this.shadow, "No categories", "Create a category first with the + button.");
    return;
  }
  WebInModals.showAddAppModal(
    this.shadow,
    categoryName || this.currentTab || WebInState.tabs[0],
    (newApp, category) => {
      WebInState.tabContent[category].push(newApp);
      WebInState.saveState();
      this.searchInput.value = "";
      this.setActiveTab(category);
    },
    prefill
  );
};

// "★" button: add the page the user is currently on
WebInUI.addCurrentPage = async function () {
  let page = null;
  if (WebInUtil.isPopupContext()) {
    const res = await WebInUtil.send({ action: "getActiveTab" });
    page = res && res.tab;
  } else {
    page = { title: document.title, url: location.href };
  }
  const url = page && WebInUtil.normalizeUrl(page.url);
  if (!url) {
    WebInModals.alert(this.shadow, "Can't add this page", "Only normal http(s) web pages can be added.");
    return;
  }
  let name = (page.title || "").split(/ [-|–—·] /)[0].trim();
  if (!name) name = new URL(url).hostname.replace(/^www\./, "");
  this.showAddAppModal(this.currentTab, { name: name.slice(0, 80), url });
};

WebInUI.showEditModal = function (item, categoryName) {
  WebInModals.showEditAppModal(
    this.shadow,
    item,
    categoryName,
    (updatedApp, newCategory) => {
      const list = WebInState.tabContent[categoryName];
      const idx = list.indexOf(item);
      if (idx === -1) return;
      if (newCategory && newCategory !== categoryName && WebInState.tabContent[newCategory]) {
        list.splice(idx, 1);
        WebInState.tabContent[newCategory].push(updatedApp);
      } else {
        list[idx] = updatedApp;
      }
      if (updatedApp.url !== item.url && WebInState.usage[item.url]) {
        WebInState.usage[updatedApp.url] = WebInState.usage[item.url];
        delete WebInState.usage[item.url];
      }
      WebInState.saveState();
      this.refreshView();
    },
    () => {
      const list = WebInState.tabContent[categoryName];
      const idx = list.indexOf(item);
      if (idx > -1) {
        list.splice(idx, 1);
        WebInState.saveState();
        this.refreshView();
      }
    }
  );
};
