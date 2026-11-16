# IDML export spike (v0.1.0 gate)

**Status:** open — must pass before shipping File → Export IDML.

## Goal

Produce an `.idml` package that opens in Adobe InDesign (or a documented validator) with:

1. `role:` values as named paragraph styles
2. Hard flow breaks (`//break`, `//break page`, odd/even) as real page/column breaks
3. Trim/margins from Rig `layout` when present

## Routes under evaluation

| Route | Approach | Pros | Cons |
|-------|----------|------|------|
| A | Pandoc `icml` writer → wrap ICML into IDML zip (designmap, mimetype, Stories, Styles, Spreads) | Reuses AST + filter | ICML ≠ IDML; packaging is non-trivial |
| B | Direct IDML XML from Pandoc JSON AST | Full control of styles/breaks | Large surface area |

## Exit criteria

- Fixture `dialect/markbreak/fixtures/roles-and-breaks.md` exports to `.idml`
- File opens in InDesign **or** passes a checked-in structural validator (designmap + story XML with page breaks)
- Roles and breaks asserted in automated unzip tests

## Decision rule

If neither route meets the exit criteria within the spike window, **do not** ship an IDML menu item. Record the cut in `TODO.md` and defer IDML past v0.1.0.

## Current product state

No IDML implementation is shipped. Profile exporters today: DOCX, HTML, print-proof PDF (Electron), secondary Pandoc PDF.
