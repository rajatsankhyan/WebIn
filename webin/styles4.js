// ----------------------------------------------------------------------------
// WebIn -- Floating Overlay for Instant Access to Web Applications
// ----------------------------------------------------------------------------
// styles4.js -- Stylesheet (Part 4)
// ===========================================================
// Styles for the newer features: keyboard selection, command palette rows,
// category toolbar ("Open all"), drag & drop reordering, the settings panel,
// notes / to-do widget and small form controls.
// ----------------------------------------------------------------------------

const WEBIN_STYLES_PART4 = `
.wrapper:focus { outline: none !important; }

/* ---- Long app names: max 2 lines, never overflow the card ---- */
.card { overflow: hidden !important; }
.card p {
  max-width: 100% !important;
  overflow-wrap: anywhere !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

/* ---- Keyboard selection ---- */
.card.selected, .palette-row.selected {
  outline: 2px solid var(--w-select) !important;
  outline-offset: 2px !important;
  border-color: var(--w-select) !important;
}

/* ---- Drag & drop ---- */
.card.dragging, .nav button.dragging { opacity: 0.4 !important; }
.card.drag-over { box-shadow: -4px 0 0 var(--w-accent) !important; }
.nav button.drag-over { box-shadow: -3px 0 0 var(--w-accent) !important; }

/* ---- Section header with actions ---- */
.section-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--w-muted) !important;
  padding: 6px 10px !important;
  margin-top: 16px !important;
  border: 1px solid var(--w-border) !important;
  background: var(--w-bg2) !important;
  text-transform: uppercase !important;
}
.section-bar:first-child { margin-top: 0 !important; }
.section-bar .count { font-weight: 400 !important; opacity: 0.8 !important; }
.mini-btn {
  font-size: 10px !important;
  padding: 3px 8px !important;
  border: 1px solid var(--w-border) !important;
  background: var(--w-surface) !important;
  color: var(--w-text) !important;
  cursor: pointer !important;
  text-transform: uppercase !important;
  font-weight: 600 !important;
}
.mini-btn:hover { background: var(--w-accent) !important; color: #fff !important; border-color: var(--w-accent) !important; }
.mini-btn.danger { color: var(--w-danger) !important; border-color: var(--w-danger) !important; }
.mini-btn.danger:hover { background: var(--w-danger) !important; color: #fff !important; }

/* ---- Command palette rows ---- */
.palette-list { display: flex !important; flex-direction: column !important; gap: 6px !important; padding-top: 10px !important; }
.palette-row {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 8px 10px !important;
  background: var(--w-surface) !important;
  border: 1px solid var(--w-border) !important;
  color: var(--w-text) !important;
  cursor: pointer !important;
  font-size: 12px !important;
  min-width: 0 !important;
}
.palette-row:hover { border-color: var(--w-accent) !important; }
.palette-row img { width: 16px !important; height: 16px !important; flex-shrink: 0 !important; }
.palette-row .p-icon { width: 16px !important; text-align: center !important; flex-shrink: 0 !important; color: var(--w-accent) !important; font-weight: 700 !important; }
.palette-row .p-title { flex: 1 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
.palette-row .p-sub { color: var(--w-muted) !important; font-size: 10px !important; max-width: 40% !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
.palette-hint { font-size: 11px !important; color: var(--w-muted) !important; padding: 4px 2px !important; }

/* ---- Footer hint ---- */
.footer kbd {
  font-size: 10px !important;
  padding: 0 4px !important;
  border: 1px solid var(--w-muted) !important;
  background: var(--w-surface) !important;
  color: var(--w-text) !important;
}

/* ---- Wide modal (settings / notes) ---- */
.modal.wide { max-width: 560px !important; max-height: 85% !important; overflow-y: auto !important; }
.modal.wide::-webkit-scrollbar { width: 6px !important; }
.modal.wide::-webkit-scrollbar-thumb { background: var(--w-accent) !important; }
.settings-section { margin-top: 16px !important; }
.settings-section h4 {
  font-size: 11px !important;
  text-transform: uppercase !important;
  color: var(--w-accent) !important;
  margin-bottom: 8px !important;
  letter-spacing: 1px !important;
}
.settings-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  padding: 6px 0 !important;
  font-size: 12px !important;
  color: var(--w-text) !important;
}
.settings-row label { flex: 1 !important; }
.settings-row .modal-select { width: 180px !important; padding: 6px 8px !important; font-size: 12px !important; }
.settings-row input[type="checkbox"] { width: 16px !important; height: 16px !important; accent-color: var(--w-accent) !important; cursor: pointer !important; }
.settings-actions { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; }
.settings-note { font-size: 11px !important; color: var(--w-muted) !important; line-height: 1.5 !important; margin-top: 4px !important; }
.status-ok { color: var(--w-accent) !important; }
.status-err { color: var(--w-danger) !important; }

/* ---- Notes & to-do ---- */
.notes-area {
  width: 100% !important;
  min-height: 110px !important;
  resize: vertical !important;
  padding: 10px !important;
  border: 1px solid var(--w-border) !important;
  background: var(--w-surface) !important;
  color: var(--w-text) !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
}
.notes-area:focus { outline: none !important; border-color: var(--w-accent) !important; }
.todo-add { display: flex !important; gap: 8px !important; margin-bottom: 8px !important; }
.todo-list { display: flex !important; flex-direction: column !important; gap: 4px !important; }
.todo-item {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 6px 8px !important;
  background: var(--w-surface) !important;
  border: 1px solid var(--w-border) !important;
  font-size: 12px !important;
  color: var(--w-text) !important;
}
.todo-item span { flex: 1 !important; word-break: break-word !important; }
.todo-item.done span { text-decoration: line-through !important; opacity: 0.55 !important; }
.todo-item input { accent-color: var(--w-accent) !important; }
.todo-item button {
  background: none !important; border: none !important; cursor: pointer !important;
  color: var(--w-muted) !important; font-size: 14px !important; line-height: 1 !important;
}
.todo-item button:hover { color: var(--w-danger) !important; }

.modal-select option { background: var(--w-surface) !important; color: var(--w-text) !important; }
`;
