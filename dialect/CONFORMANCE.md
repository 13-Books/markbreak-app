# MarkBreak 0.5.1 conformance matrix (v0.1.0)

Pinned profile: `dialect/markbreak` **0.5.2**. Normative text: `dialect/markbreak/specification.md`.

| Construct | Preview (Pages/Spreads) | DOCX | HTML | Print-proof PDF | Pandoc PDF | ICML |
|-----------|-------------------------|------|------|-----------------|------------|------|
| YAML `role:` (closed set) | Section chrome when present | Pandoc Div `role=` | Div/class | Same as preview | Pandoc Div | `ParagraphStyle/{role}` |
| Unknown `role` | Preserve | Preserve | Preserve | Preserve | Preserve | Style name preserved |
| `spine:` multi-file | N/A in single-tab v0.1.0 | Concat + role Divs | Same | N/A | Same as DOCX | Same as DOCX path |
| `meta:` / `layout:` | Trim/margins/type from Rig or prefs | Writer copies page + meta | Stylesheet from prefs/Rig | Geometry from preview | Geometry via export.sh | Fragment; layout is InDesign’s job |
| `//break` (normal advance) | Folio boundary | Column break | `break-before` | Folio page | Column/TeX | `Br type="nextColumn"` |
| `//break page` | Forced folio page | Page break | `break-before: page` | Forced page | Page break | `Br type="nextPage"` |
| `//break odd` / `even` | Spread-aware folio | Section mark | CSS page break | Spread-aware | Section mark | `nextOddPage` / `nextEvenPage` |
| Thematic `---` | Scene pause, not a folio break | Not a page break | Not a page break | Not a page break | Not a page break | Not a page break |
| Headings `#`–`####+` | Hierarchy only | Hierarchy only | Hierarchy only | Hierarchy only | Hierarchy only | Hierarchy only |
| Rig `fontSize` / `leading` | Type prefs / Rig override | Writer applies when exporting | Stylesheet | Preview type | LaTeX where possible | InDesign styles after Place |

Gates: `dialect/markbreak/tools/verify.sh` (DOCX roles/breaks + meta-layout). App exporters add HTML/ICML smoke via `dialect/export.sh`.

**IDML** (packaged InDesign document) is out of scope for v0.1.0 — Place ICML into a template instead.
