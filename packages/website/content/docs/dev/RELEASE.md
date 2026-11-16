# Releasing MarkBreak

The release pipeline is triggered by pushing a `v*` tag. The `Release MarkBreak` workflow (`.github/workflows/release.yml`) then runs **validate → build (6-platform matrix) → publish** and creates a GitHub Release with installers and `SHA256SUMS.txt` on **`13-Books/markbreak-app`**.

For the **first** stable tag, release notes are generated without a previous-tag comparison (`scripts/select-release-base.py` returns empty). Later releases compare against the highest published stable `vX.Y.Z` below the new version.

v0.1.0 ships as a **direct stable** tag (no RC), per product decision.

## Prerequisites

- Push access to `13-Books/markbreak-app`
- `gh` CLI authenticated (`gh auth status`)
- A clean checkout of the latest `develop`
- Submodule `dialect/markbreak` initialized (profile pin in `MARKBREAK.md`)
- Green lint, typecheck, unit tests, dialect `verify.sh`, and installer smoke on at least Win x64 / macOS arm64 / Linux x64

## 1. Cut a release branch

```bash
git checkout develop
git pull --ff-only
git checkout -b release/v0.1.0
```

## 2. Bump the application version

Set the same `version` in the root `package.json` and `packages/desktop/package.json` (e.g. `0.1.0`). Update `packages/website/content/docs/CHANGELOG.md`. Confirm download URLs in `product.ts` and `site/index.html` point at `13-Books/markbreak-app`.

```bash
pnpm install --lockfile-only --ignore-scripts
pnpm run lint
pnpm run typecheck
pnpm run test
bash dialect/markbreak/tools/verify.sh
```

## 3. Commit and push

```bash
git add package.json packages/desktop/package.json packages/website/content/docs/CHANGELOG.md
git commit -m "chore(release): v0.1.0"
git push -u origin release/v0.1.0
```

## 4. Tag and push

A tag push publishes a public release after all builds succeed.

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

## 5. Monitor and verify

```bash
gh run list --workflow=release.yml --limit 3
gh release view v0.1.0
```

Confirm assets, `SHA256SUMS.txt`, and that [markbreak.app/#download](https://markbreak.app/#download) reaches this release. macOS remains unsigned — quarantine workaround is in the release body.

## Hotfixes

See [RELEASE_HOTFIX.md](RELEASE_HOTFIX.md).
