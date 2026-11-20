// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
//
// popup-inject.js -- Standalone Popup Window Entry Point
// ===========================================================
// Used by popup.html when WebIn is launched on pages where content scripts
// can't run (chrome://, brave://, the Web Store, PDFs...). Builds the same UI
// as the overlay (via WebInApp) but full-window, without backdrop, drag or
// resize. Closing calls window.close().
// ----------------------------------------------------------------------------

(() => {
  const closeWindow = () => window.close();

  WebInState.loadState(() => {
    WebInUI.close = closeWindow;
    const { host } = WebInApp.build({ popup: true, onClose: closeWindow });
    document.body.appendChild(host);
    setTimeout(() => WebInUI.searchInput.focus(), 100);
  });
})();
