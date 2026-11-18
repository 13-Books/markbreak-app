# Picture-book fixture

Small MarkBreak manuscript used by writing-to-print phases ([PICTURE_BOOK_PHASES.md](../../../../../PICTURE_BOOK_PHASES.md)).

| File | Role |
|------|------|
| `manuscript.md` | Chapter with scene breaks and two images |
| `meta.md` / `layout.rig.json` / `book.css` | Imprint, trim, sheet |
| `art/*.png` | Generated solid colours (`generate-art.mjs`) |
| `Fox-in-the-Snow.docx` | Word-saved fixture with breaks (`build-word-fixture.mjs`) |

```bash
node packages/desktop/test/fixtures/picture-book/generate-art.mjs
node packages/desktop/test/fixtures/picture-book/build-word-fixture.mjs
```
