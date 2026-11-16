# MarkBreak 0.5.1 conformance matrix (v0.1.0)

Pinned profile: `dialect/markbreak` **0.5.1**. Normative text: `dialect/markbreak/specification.md`.

| Construct | Preview (Pages/Spreads) | DOCX | HTML | Print-proof PDF | Pandoc PDF | IDML |
|-----------|-------------------------|------|------|-----------------|------------|------|
| YAML `role:` (closed set) | Shown as section chrome when present | Pandoc Div `role=` | Div/class | Same as preview | Pandoc Div | Named paragraph style |
| Unknown `role` | Preserve | Preserve, no invented layout | Preserve | Preserve | Preserve | Preserve or map to Body |
| `spine:` multi-file | N/A in single-tab v0.1.0 | Concat + role Divs | Same | N/A (single open doc) | Same as DOCX path | Same as DOCX path |
| `meta:` / `layout:` | Trim/margins/type from Rig or prefs | Writer copies page + meta | Stylesheet from prefs/Rig | Geometry from preview | Geometry via export.sh | Page size + styles |
| `//break` (normal advance) | Folio boundary | Column break | `break-before` | Folio page | Column/TeX | Hard break |
| `//break page` | Forced folio page | Page break | `break-before: page` | Forced page | Page break | Page break |
| `//break odd` / `even` | Spread-aware folio | Section mark | CSS page break | Spread-aware | Section mark | Section/page break |
| Thematic `---` | Scene pause, not a folio break | Not a page break | Not a page break | Not a page break | Not a page break | Not a page break |
| Headings `#`–`####+` | Hierarchy only | Hierarchy only | Hierarchy only | Hierarchy only | Hierarchy only | Hierarchy only |
| Rig `fontSize` / `leading` | Type prefs / Rig override | Writer applies when exporting | Stylesheet | Preview type | LaTeX where possible | Paragraph style |

Gates: `dialect/markbreak/tools/verify.sh` (DOCX roles/breaks + meta-layout). App exporters add HTML/IDML/print-PDF golden tests in Phase 6.
