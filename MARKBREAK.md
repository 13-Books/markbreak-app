# MarkBreak app

Private writer for [markbreak.app](https://markbreak.app). Emits the open [MarkBreak](https://markbreak.com) dialect.

| Piece | Location |
|-------|----------|
| Open SPEC / verify | Sibling repo `../markbreak` (or a git submodule later) |
| Dialect export | `dialect/export.ps1` + `dialect/markbreak.lua` |
| RigWorks map | `../markbreak/docs/RIGWORKS.md` — `flow.role`, `breakType` |
| Site stub | `site/` → markbreak.app |
| Online editor | `packages/online` builds `site/edit.html` (`pnpm --filter markbreak-online dev`). Markdown via `@muyajs/core`; CSV/TSV; `?url=` / `?text=` / `?lang=csv` / file picker / Open SPEC |
| Editor base | MIT upstream — see [UPSTREAM.md](UPSTREAM.md) (do not cite in marketing) |
| Later | [TODO.md](TODO.md) — git history, then comments. Not current work. |

## Dev

```powershell
pnpm install
pnpm dev
```

Requires Node ≥ 22 and pnpm 10 (see root `package.json`).

If the disk cannot create symlinks, put `node-linker=hoisted` in your user npmrc. Leave that setting out of this repo.
