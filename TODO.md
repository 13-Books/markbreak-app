# MarkBreak app backlog

## Current — v0.1.0 print product

Desktop-first writer that conforms to the published MarkBreak profile (**0.5.1**). Tracking stays in this file (private repo). Optional epic stub: [#1](https://github.com/13-Books/markbreak-app/issues/1).

**Sketch (not a golden example):** `docs/prototype/focus-writer/` shows pages correctly (trim, margins, folios, spreads). Its code and chrome are throwaway. Pages/Spreads is another view of the one manuscript — not a port of the sketch.

**Defaults (locked)**

- Pages/Spreads are in scope (another view of the document, not export-only).
- Print-proof PDF is the product PDF; Pandoc PDF is secondary via `dialect/export.sh`.
- Trade 6×9 and mass-market are first-class page sizes.
- Export targets: DOCX, HTML, print-proof PDF; IDML spike-gated (`docs/IDML-SPIKE.md`).
- Desktop (`packages/desktop`) first; online stays thin until Pages/Spreads AC is met.
- Do not enable Issues on public `13-Books/marktext` for this work.

### Checklist

- [x] **Spec pin 0.5.1** — Submodule at `v0.5.1`; conformance matrix in `dialect/CONFORMANCE.md`.
- [x] **Archive focus-writer** — Sketch + fonts at `docs/prototype/focus-writer/`; README says sketch that shows pages correctly.
- [x] **Insert flow break UX** — `/np`, Break control, Ctrl/Cmd+Shift+Enter insert `//break`; source + WYSIWYG; desktop only.
- [x] **Folio Markdown export** — Save keeps `//break` lines; migrate `\newpage` → `//break page` on load.
- [x] **Page size prefs** — A5, A4, Letter, Trade 6×9, mass-market; orientation; margins mm; prefs + export dialog.
- [x] **Pages + Spreads views** — View mode bar; pages/spreads from folio splits; page 1 recto; desktop first (read-only page cards in v0.1.0; edit in Editor/Source).
- [x] **Type prefs → page proof** — Face, size, leading, tracking, indent, measure prefs drive the page view; OFL faces under `static/fonts/book/`.
- [x] **Print-proof PDF** — Export PDF uses printToPDF with Rig or book trim (Trade/MassMarket microns).
- [x] **Profile DOCX / HTML / Pandoc PDF** — Packaged `dialect/` in installer; HTML via export.sh; Pandoc PDF labelled secondary.
- [ ] **IDML** — Spike open (`docs/IDML-SPIKE.md`); **not shipped in v0.1.0** until exit criteria pass.
- [x] **Guides** — `site/guides/04-export.html` matches the exporter story; downloads → `13-Books/markbreak-app`.
- [x] **Release engineering** — First-tag notes, version `0.1.0`, `13-Books` URLs, develop CI + dialect-verify workflow.
- [ ] **Decommission bookmd** — After smoke of the tagged build; no unique tooling left only in bookmd.

**Out of scope for this pass:** enabling Issues on public marktext; iA outreach notes; continuous auto-reflow pagination of unbroken text; shipping IDML before the spike passes.

---

## Later — history and comments

Professional editors still take manuscripts through Word because the file has a history and because they can leave a note on a sentence. MarkBreak needs both before an editor will work here.

This section is that backlog. It is not current work.

### 1. Version tracking with git

The manuscript folder is the document. Git is the history.

### 2. Comments

An editor marks a span and leaves a note. The writer replies. Someone resolves it.

### Order

Git history first. Comments second. Pick this up only while the profile gate still exits 0 and the v0.1.0 checklist above is complete (including IDML decision).
