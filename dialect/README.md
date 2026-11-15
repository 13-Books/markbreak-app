# Dialect bridge

The Pandoc filter and fixtures live in **[13-Books/markbreak](https://github.com/13-Books/markbreak)** — not in this folder as a private copy.

| Path | Role |
|------|------|
| `markbreak/` | Git submodule — pinned profile |
| `export.sh` | Docx/PDF via Pandoc + submodule filter |

**Pinned profile:** `0.4.0` (`v0.4.0`). See `markbreak/VERSION` after init.

```bash
git submodule update --init --recursive
bash dialect/export.sh --input path/to/manuscript.md --format docx
bash dialect/export.sh --input path/to/manuscript.md --format pdf --rig path/to/book.rig.json
```

The chapter may name `layout` and `meta`. `layout` is the RigWorks page. `meta` is the publication file. A sibling `.rig.json` is used when `layout` is absent. `--rig` overrides both.

Needs bash, Node, and Pandoc. On Windows, run it from Git Bash (the app looks for Git Bash itself).

Do not add a second `markbreak.lua` here. Bump the submodule to a newer `vX.Y.Z` when the app adopts a new profile.
