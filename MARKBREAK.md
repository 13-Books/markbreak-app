# MarkBreak app

Private writer for [markbreak.app](https://markbreak.app). Emits the open [MarkBreak](https://markbreak.com) dialect.

| Piece | Location |
|-------|----------|
| Open profile (SoT) | Git submodule `dialect/markbreak` → [13-Books/markbreak](https://github.com/13-Books/markbreak) |
| Pinned profile | **0.2.0** (`v0.2.0`) — see `dialect/markbreak/VERSION` |
| Dialect export | `dialect/export.ps1` (filter from submodule; sibling `../markbreak` for local hackery only) |
| Site stub | `site/` → markbreak.app |
| Online editor | `packages/online` builds `site/edit.html` (`pnpm --filter markbreak-online dev`). Markdown via `@muyajs/core`; CSV/TSV; `?url=` / `?text=` / `?lang=csv` / file picker / Open specification |
| Editor base | MIT upstream — see [UPSTREAM.md](UPSTREAM.md) (do not cite in marketing) |
| Later | [TODO.md](TODO.md) — git history, then comments. Not current work. |

## Dialect pin

```powershell
git submodule update --init --recursive
# adopt a newer profile:
#   cd dialect/markbreak && git fetch && git checkout v0.3.0
#   cd ../.. && git add dialect/markbreak && git commit -m "Bump MarkBreak profile to 0.3.0"
```

Never vendor a private `markbreak.lua` next to `export.ps1`.

## Dev

```powershell
pnpm install
pnpm dev
```

Requires Node ≥ 22 and pnpm 10 (see root `package.json`).

If the disk cannot create symlinks, put `node-linker=hoisted` in your user npmrc. Leave that setting out of this repo.
