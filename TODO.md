# MarkBreak app backlog

## Current — v0.1.0 print product

Desktop-first writer that conforms to the published MarkBreak profile (**0.5.2**). Tracking stays in this file (private repo). Optional epic stub: [#1](https://github.com/13-Books/markbreak-app/issues/1).

**Sketch (not a golden example):** `docs/prototype/focus-writer/` shows pages correctly (trim, margins, folios, spreads). Its code and chrome are throwaway. Pages/Spreads is another view of the one manuscript — not a port of the sketch.

**Defaults (locked)**

- Pages/Spreads are in scope (another view of the document, not export-only).
- Print-proof PDF is the product PDF; Pandoc PDF is secondary via `dialect/export.sh`.
- Trade 6×9 and mass-market are first-class page sizes.
- Export targets: DOCX, HTML, print-proof PDF, **ICML** (InDesign Place). Full IDML packages are later.
- Desktop (`packages/desktop`) first; online stays thin until Pages/Spreads AC is met.
- Do not enable Issues on public `13-Books/marktext` for this work.
- **bookmd is decommissioned** — no further checklist item.

### Checklist

- [x] **Spec pin 0.5.2** — Submodule with ICML Place emit; conformance matrix in `dialect/CONFORMANCE.md`.
- [x] **Archive focus-writer** — Sketch + fonts at `docs/prototype/focus-writer/`.
- [x] **Insert flow break UX** — `/np`, Break control, Ctrl/Cmd+Shift+Enter; source + WYSIWYG.
- [x] **Folio Markdown export** — Save keeps `//break`; migrate `\newpage` on load.
- [x] **Page size prefs** — A5, A4, Letter, Trade 6×9, mass-market; orientation; margins mm.
- [x] **Pages + Spreads views** — View mode bar; folio splits; page 1 recto.
- [x] **Type prefs → page proof** — Face/size/leading/tracking/indent/measure; OFL faces bundled.
- [x] **Print-proof PDF** — printToPDF with Rig or book trim.
- [x] **Profile DOCX / HTML / Pandoc PDF** — Packaged dialect; Pandoc PDF labelled secondary.
- [x] **ICML** — `dialect/export.sh --format icml` + File → Convert with Pandoc → ICML; roles as paragraph styles, breaks as `Br type=…`.
- [x] **Guides / release engineering** — Export guide, `13-Books` download URLs, first-tag workflow, develop CI.
- [x] **Decommission bookmd** — Done (no longer tracked).

**Out of scope for this pass:** enabling Issues on public marktext; iA outreach notes; continuous auto-reflow of unbroken text; packaged **IDML** (use ICML Place).

---

## Later — history and comments

Professional editors still take manuscripts through Word because the file has a history and because they can leave a note on a sentence. MarkBreak needs both before an editor will work here.

### Order

Git history first. Comments second. Pick this up only while the profile gate still exits 0.
