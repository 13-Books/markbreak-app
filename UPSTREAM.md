# Upstream policy

Chain:

```text
marktext/marktext  →  13-Books/marktext  →  13-Books/markbreak-app
     (editor)              (features)              (MarkBreak product)
```

This repo is the **MarkBreak product overlay**. Editor features land on [`13-Books/marktext`](https://github.com/13-Books/marktext) first; this tree keeps product naming and print packaging.

## Remotes (`D:\repos\markbreak-app`)

- `upstream` → `https://github.com/13-Books/marktext.git` (merge/rebase base; fetch **only** `develop`)
- `origin` → `https://github.com/13-Books/markbreak-app.git` (this product repo)

Do **not** point this repo’s `upstream` at `marktext/marktext`. Sync from MarkText official through the middle fork only.

Fetch refspec (keeps the branch list clean):

```text
remote.upstream.fetch=+refs/heads/develop:refs/remotes/upstream/develop
```

## Feature clone (`D:\repos\marktext`)

Separate working copy of the middle fork:

- `origin` → `https://github.com/13-Books/marktext.git`
- `upstream` → `https://github.com/marktext/marktext.git` (fetch/sync; PRs to official MarkText are a later follow-up)

## Fork-first features

**Every** reusable editor change gets its **own feature branch** and PR into `13-Books/marktext` `develop` (MarkText names only — no MarkBreak strings).

After it merges there:

```powershell
git fetch upstream
git merge upstream/develop
```

Then keep only MarkBreak-specific commits on top in this repo.

**Do not** open PRs to `marktext/marktext` in the current phase. That is a follow-up after the fork work is done.

## Stay only in this tree

- MarkBreak branding, pricing, markbreak.app chrome
- YAML `role:` / print matter UX packaged as product
- `//---` / `\newpage` dialect and Pandoc verify gates
- RigWorks `.rig` export (`rig.story.flow.role`, `breakType`)
- `dialect/`, `site/`, `packages/online`, and MarkBreak-named modules

## Identity

User-visible product name is **MarkBreak**: window title, About, menus, installer ProgId `MarkBreak.Document`, executable `markbreak`, AppUserModelId `com.markbreak.app`, user-data and keychain names. Help links go to markbreak.app and markbreak.com. The License item still opens the MIT license from the editor base.

Leave these alone so refreshing from `upstream` (`13-Books/marktext`) stays small:

- `window.marktext`, menu module names, i18n keys such as `menu.marktext`
- `MARKTEXT_PANDOC`, `MARKTEXT_VERSION_STRING`, and the other `MARKTEXT_*` env vars
- `packages/website` (upstream docs site)
- the `@marktext/file-icons` package name — track its version (currently 1.1.0). Do not pin an older release.

## Sell

MIT allows a commercial, differently branded product. Retain MarkText copyright notices required by the license, including the About line for Luo Ran. Do not use the MarkText trademark as your product name. Do not file bugs or support requests on the official MarkText tracker.
