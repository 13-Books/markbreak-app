# Dialect bridge

The Pandoc filter and fixtures live in **[13-Books/markbreak](https://github.com/13-Books/markbreak)** — not in this folder as a private copy.

| Path | Role |
|------|------|
| `markbreak/` | Git submodule — pinned profile |
| `export.ps1` | Docx/PDF via Pandoc + submodule filter |
| `export-rig.ps1` | Minimal RigWorks JSON from a manuscript |

**Pinned profile:** `0.2.0` (`v0.2.0`). See `markbreak/VERSION` after init.

```powershell
git submodule update --init --recursive
powershell -File dialect/export.ps1 -InputFile path\to\manuscript.md -Format docx
```

Do not add a second `markbreak.lua` here. Bump the submodule to a newer `vX.Y.Z` when the app adopts a new profile.
