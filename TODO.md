# MarkBreak app backlog

## Current — bookmd → MarkBreak chrome migration

Decommission local `bookmd` by porting the focus-writer prototype into this app. Dialect law lives in submodule `dialect/markbreak` (pinned profile **0.2.0**). Tracking stays in this file (private repo). Optional epic stub: [#1](https://github.com/13-Books/markbreak-app/issues/1).

**Golden reference (after archive):** `docs/prototype/focus-writer/` — port from there. Source today: `D:\repos\bookmd\prototype\focus-writer`.

**Defaults (locked)**

- Pages/Spreads are in scope (not export-only).
- Print-proof PDF is the product PDF; Pandoc PDF is secondary via `dialect/export.ps1`.
- Trade 6×9 and mass-market are first-class page sizes.
- Desktop (`packages/desktop`) first; online stays thin until Pages/Spreads AC is met.
- Do not enable Issues on public `13-Books/marktext` for this work.

### Checklist

- [ ] **Archive focus-writer** — Copy prototype + fonts/licenses to `docs/prototype/focus-writer/`; README says golden UX, not shipped chrome; skip or mark `OUTREACH-draft.md` non-product; pointer from `MARKBREAK.md`.
- [ ] **Insert flow break UX** — `/np` + Space/Enter, Break control, Ctrl+Shift+Enter insert `//---` (or `\newpage` per specification); visible in source; desktop only; no second dialect.
- [ ] **Folio Markdown export** — Export/save rewrites `//---` / `//—` / `//break` → `\newpage`; matches prototype `folioMarkdown()`; suitable for `dialect/export.ps1`.
- [ ] **Page size prefs** — A5, A4, Letter, Trade 6×9, mass-market; orientation; margins mm; persist; available to Pages/Spreads (not export-dialog-only).
- [ ] **Pages + Spreads views** — Source / Split / Pages / Spreads; editable page cards; two-way sync; spreads verso/recto (page 1 opens right); desktop first.
- [ ] **Type prefs → page proof** — Face, size, leading, tracking, indent, measure apply to page cards.
- [ ] **Print-proof PDF** — Export PDF uses Pages proof + print/printToPDF with geometry; not only generic MarkText PDF.
- [ ] **Pandoc Docx/PDF in UI** — App invokes or clearly wires `dialect/export.ps1` so Docx keeps real page breaks.
- [ ] **Guides** — `site/guides/04-export.html` (and related) match print-proof PDF vs Docx story.
- [ ] **Decommission bookmd** — No unique specification/tools only in bookmd; README/HOLE no longer treat bookmd as home; archive or delete `D:\repos\bookmd` after checklist above is done.

**Out of scope for this pass:** IDML; enabling Issues on public marktext; iA outreach notes.

**Order:** archive → break insert → folio export → page sizes → Pages/Spreads → type prefs → print PDF → dialect UI → guides → decommission.

---

## Later — history and comments

Professional editors still take manuscripts through Word because the file has a history and because they can leave a note on a sentence. MarkBreak needs both before an editor will work here.

This section is that backlog. It is not current work. Current work is the migration checklist above, then the print profile gate (`tools/verify` in sibling `markbreak`).

### 1. Version tracking with git

The manuscript folder is the document. Git is the history.

When this starts:

- Show whether the open folder is a git repo, and offer to create one when it is not.
- Turn a save into a commit. The writer supplies the message.
- List commits and open the manuscript as it stood at a chosen commit.
- Show what changed between the working copy and an earlier commit, including the passage in view.
- Keep that history in the git repo next to the files. The app does not keep a second revision log.

Done when an editor can answer, from inside the writer, what a paragraph said last Tuesday and who changed it.

### 2. Comments

An editor marks a span and leaves a note. The writer replies. Someone resolves it.

When this starts:

- Anchor a comment to a span of text.
- Show the note beside that span, with author and time.
- Support reply and resolve.
- Keep comments across save and reopen.
- If a comment must survive Pandoc export into Word, the on-disk marker is a Pandoc-compatible change to the open profile (`specification.md` in the `markbreak` repo), decided at the start of this work. The editing chrome stays in this app.

Done when an editor can leave a note on a sentence, the writer can answer it, and the note is still there after the file is closed and opened again.

### Order

Git history first. Comments second. Pick this up only while the profile gate still exits 0 and the migration checklist above is complete.
