# Later — history and comments

Professional editors still take manuscripts through Word because the file has a history and because they can leave a note on a sentence. MarkBreak needs both before an editor will work here.

This file is that backlog. It is not current work. Current work stays the print profile: YAML roles and flow breaks, gated by `tools/verify.ps1` in the sibling `markbreak` repo.

## 1. Version tracking with git

The manuscript folder is the document. Git is the history.

When this starts:

- Show whether the open folder is a git repo, and offer to create one when it is not.
- Turn a save into a commit. The writer supplies the message.
- List commits and open the manuscript as it stood at a chosen commit.
- Show what changed between the working copy and an earlier commit, including the passage in view.
- Keep that history in the git repo next to the files. The app does not keep a second revision log.

Done when an editor can answer, from inside the writer, what a paragraph said last Tuesday and who changed it.

## 2. Comments

An editor marks a span and leaves a note. The writer replies. Someone resolves it.

When this starts:

- Anchor a comment to a span of text.
- Show the note beside that span, with author and time.
- Support reply and resolve.
- Keep comments across save and reopen.
- If a comment must survive Pandoc export into Word, the on-disk marker is a Pandoc-compatible change to the open profile (`SPEC.md` in the `markbreak` repo), decided at the start of this work. The editing chrome stays in this app.

Done when an editor can leave a note on a sentence, the writer can answer it, and the note is still there after the file is closed and opened again.

## Order

Git history first. Comments second. Pick this up only while the profile gate still exits 0.
