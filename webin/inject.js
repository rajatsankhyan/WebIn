// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
//
// inject.js -- Content Script Entry Point
// ===========================================================
// Injected into web pages via chrome.scripting.executeScript.
//   - window.__webinInjected prevents duplicate initialisation.
//   - Listens for "webin_toggle" messages from background.js.
//   - Opens the overlay (built by WebInApp) with a blurred backdrop, or
//     closes it with a fade-out animation.
//   - Stops key events from leaking to the page behind the overlay.
// ----------------------------------------------------------------------------

(() => {
  if (window.__webinInjected) {
    window.__webinToggle && window.__webinToggle();
    return;
  }
  window.__webinInjected = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "webin_toggle") {
      toggleOverlay();
      sendResponse({ ok: true });
    }
  });

  let isClosing = false;

  function closeOverlay() {
    const host = document.getElementById("webhub-shadow-host");
    const backdrop = document.querySelector(".webhub-backdrop");
    if (!host || isClosing) return;
    isClosing = true;
    const ease = "0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    host.style.transition = `opacity ${ease}, transform ${ease}`;
    host.style.opacity = "0";
    host.style.transform = "scale(0.97) translateZ(0)";
    if (backdrop) {
      backdrop.style.transition = `opacity ${ease}`;
      backdrop.style.opacity = "0";
    }
    if (host._cleanup) host._cleanup();
    setTimeout(() => {
      host.remove();
      if (backdrop) backdrop.remove();
      isClosing = false;
    }, 300);
  }

  function toggleOverlay() {
    if (document.getElementById("webhub-shadow-host")) {
      closeOverlay();
      return;
    }
    WebInState.loadState(() => openOverlay());
  }
  window.__webinToggle = toggleOverlay;

  function openOverlay() {
    if (document.getElementById("webhub-shadow-host")) return;

    const backdrop = document.createElement("div");
    backdrop.className = "webhub-backdrop";
    backdrop.style.cssText =
      "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.3); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); z-index:2147483646; opacity:0; transition:opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1); will-change:opacity;";
    backdrop.addEventListener("click", closeOverlay);
    document.body.appendChild(backdrop);

    WebInUI.close = closeOverlay;
    const { host, wrapper, header } = WebInApp.build({ popup: false, onClose: closeOverlay });
    document.body.appendChild(host);

    // Keep keyboard events from reaching the page (bubble phase, so the
    // overlay's own handlers inside the Shadow DOM run first)
    ["keydown", "keyup", "keypress"].forEach((type) =>
      host.addEventListener(type, (e) => e.stopPropagation())
    );

    const positionHost = WebInEvents.setupDragAndResize(host, wrapper, header);
    host._cleanup = positionHost.cleanup;
    positionHost();

    setTimeout(() => {
      host.style.opacity = "1";
      host.style.transform = "scale(1)";
      backdrop.style.opacity = "1";
      WebInUI.searchInput.focus();
    }, 60);
  }

  // Open overlay on first injection
  WebInState.loadState(() => openOverlay());
})();
