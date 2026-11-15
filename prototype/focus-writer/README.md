# Focus — Windows writing prototype

Minimal focus surface for typography demos (iA-calm direction). Not the product; a proof of type + focus.

## Font

**Source Serif 4** (variable, OFL) from [adobe-fonts/source-serif](https://github.com/adobe-fonts/source-serif). Files under `fonts/`.

## Run

```bash
bash launch.sh
```

Or open `index.html` in a browser.

- **Ctrl+Shift+F** — Focus mode (dim other sentences)
- **Ctrl+\\** — Zen (hide chrome)
- **Esc** — leave Zen

Text autosaves to `localStorage`.

## Views

| View | Shortcut | Role |
|------|----------|------|
| Source | Ctrl+1 | Manuscript (`//break` breaks) |
| Split | Ctrl+2 | Source + editable pages |
| Pages | Ctrl+3 | Stacked paper cards |
| Spreads | Ctrl+4 | Facing verso/recto (page 1 opens right) |

Pages/Spreads are writing surfaces, not previews. Edits sync to the same manuscript.

## Controls

| Action | Shortcut |
|--------|----------|
| Focus mode | Ctrl+Shift+F |
| Insert page break | `/np`+Space/Enter, or **Break** / Ctrl+Shift+Enter |
| Settings | Ctrl+, | Type · Page · View · Export tabs |
| Export | header **Export** | Markdown / Docx / PDF / HTML (IDML soon) |
| Zen | Ctrl+\ |

**Type:** face, size, leading, tracking, first-line indent, measure.  
**Page:** A5/A4/Letter/Trade/mass-market, orientation, margins (mm).  
**Export:** downloads Folio `.md` with `//break`; Docx/PDF via `export.sh` + Pandoc + `markbreak.lua`.

Quality gate: open `index.html?test=1` (or `window.__focusTest()`).

## Fonts / sources

| Face | Bundled | Upstream |
|------|---------|----------|
| Atkinson Hyperlegible Next | `AtkinsonHyperlegibleNext-*.woff2` + OFL | [googlefonts/atkinson-hyperlegible-next](https://github.com/googlefonts/atkinson-hyperlegible-next) |
| Bricolage Grotesque | `BricolageGrotesque-Variable.woff2` + OFL | [ateliertriay/bricolage](https://github.com/ateliertriay/bricolage) |
| Inter | `InterVariable*.woff2` + LICENSE | [rsms/inter](https://github.com/rsms/inter) |
| IBM Plex Sans | `IBMPlexSansVar-*.woff2` + LICENSE | [IBM/plex](https://github.com/IBM/plex) |
| Source Serif 4 | `SourceSerif4Variable-*.woff2` | [adobe-fonts/source-serif](https://github.com/adobe-fonts/source-serif) |

## Intent

Windows craft: long measure, paper grain, hyperlegible type, write in source or on pages.
