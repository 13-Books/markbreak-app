# MarkBreak

**Print manuscript writer** for [markbreak.app](https://markbreak.app).

Open dialect: [markbreak.com](https://markbreak.com). Online editor: [site/edit.html](site/edit.html) (`?url=` / `?text=` / file open).

See [MARKBREAK.md](MARKBREAK.md). Upstream editor base and contribution policy: [UPSTREAM.md](UPSTREAM.md) (internal).

## Quick start

Requires Node ≥ 22 and pnpm 10.

```powershell
pnpm install
pnpm dev
```

If the disk cannot create symlinks, put `node-linker=hoisted` in your user npmrc (`%USERPROFILE%\.npmrc`). Leave that setting out of this repo.

## Build

`pnpm dev` runs the app without packaging. `pnpm build:unpack` compiles it and stops before the installer.

A Windows x64 installer and zip:

```powershell
pnpm build:win
```

Installers land in `dist/`. The setup file is named `markbreak-win-x64-<version>-setup.exe`.

`pnpm build:mac` and `pnpm build:linux` package those platforms. Add `:x64` or `:arm64` to pick an architecture (`pnpm build:win:arm64`).

The online editor is separate:

```powershell
pnpm --filter markbreak-online build
```

That writes `site/edit.html`.

## Dialect export (Docx)

Profile is pinned via submodule `dialect/markbreak` (**0.7.0**). Init once, then export with Pandoc installed:

```bash
git submodule update --init --recursive
bash dialect/export.sh --input path/to/manuscript.md --format docx
```

See [dialect/README.md](dialect/README.md).

## Releases

Installers (Windows / macOS / Linux) are built by GitHub Actions (`.github/workflows/release.yml`).

Push a semver tag to publish:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

Artifacts land on the GitHub Releases page linked from [markbreak.app](https://markbreak.app/#download).

## License

- Editor base: MIT (copyright retained — see LICENSE, third-party notices, UPSTREAM.md)
- MarkBreak product bridge under `dialect/` (except the MIT-licensed `dialect/markbreak` submodule) and branding: proprietary unless noted
