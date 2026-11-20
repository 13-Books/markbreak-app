import { describe, expect, it } from 'vitest'
import { parseSpine, resolveSpineFileUrl, splitFrontMatter } from './spine'

describe('parseSpine', () => {
  it('reads flow and block spine entries under the spine key only', () => {
    const yaml = `
title: Demo
spine:
  - { file: "01.md", role: chapter }
  - file: "02.md"
    role: part
other:
  - { file: "nope.md", role: chapter }
`.trim()
    expect(parseSpine(yaml)).toEqual([
      { file: '01.md', role: 'chapter' },
      { file: '02.md', role: 'part' }
    ])
  })

  it('returns null when there is no spine list', () => {
    expect(parseSpine('title: x\nrole: chapter\n')).toBeNull()
  })

  it('does not treat a prose "spine:" mention outside YAML structure as entries', () => {
    // parseSpine is only handed the front-matter body; a key that is not `spine`
    // must not be scraped for file maps.
    expect(parseSpine('title: x\nnotes: "spine: fake"\n')).toBeNull()
  })
})

describe('splitFrontMatter', () => {
  it('splits a tight opening fence', () => {
    const md = '---\ntitle: A\n---\n\nBody\n'
    expect(splitFrontMatter(md)).toEqual({ yaml: 'title: A', body: 'Body\n' })
  })

  it('leaves body-only manuscripts alone', () => {
    expect(splitFrontMatter('# Hi\n')).toEqual({ yaml: null, body: '# Hi\n' })
  })
})

describe('resolveSpineFileUrl', () => {
  const root = 'https://example.test/book/book.md'

  it('resolves a relative child', () => {
    expect(resolveSpineFileUrl(root, 'chapters/01.md')).toBe(
      'https://example.test/book/chapters/01.md'
    )
  })

  it('rejects traversal and absolute URLs', () => {
    expect(() => resolveSpineFileUrl(root, '../secret.md')).toThrow(/not allowed/)
    expect(() => resolveSpineFileUrl(root, '/etc/passwd')).toThrow(/not allowed/)
    expect(() => resolveSpineFileUrl(root, 'https://evil.test/x.md')).toThrow(/relative/)
  })
})
