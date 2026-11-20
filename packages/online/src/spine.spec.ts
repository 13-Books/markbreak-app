import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { needsFolioBreakBetween, parseSpine, resolveSpineFileUrl, splitFrontMatter } from './spine.ts'

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
    assert.deepEqual(parseSpine(yaml), [
      { file: '01.md', role: 'chapter' },
      { file: '02.md', role: 'part' }
    ])
  })

  it('returns null when there is no spine list', () => {
    assert.equal(parseSpine('title: x\nrole: chapter\n'), null)
  })

  it('does not treat a prose "spine:" mention outside YAML structure as entries', () => {
    assert.equal(parseSpine('title: x\nnotes: "spine: fake"\n'), null)
  })
})

describe('splitFrontMatter', () => {
  it('splits a tight opening fence', () => {
    const md = '---\ntitle: A\n---\n\nBody\n'
    assert.deepEqual(splitFrontMatter(md), { yaml: 'title: A', body: '\nBody\n' })
  })

  it('leaves body-only manuscripts alone', () => {
    assert.deepEqual(splitFrontMatter('# Hi\n'), { yaml: null, body: '# Hi\n' })
  })
})

describe('needsFolioBreakBetween', () => {
  it('inserts a break only when neither side already has one', () => {
    assert.equal(needsFolioBreakBetween('Hello', '# Chapter'), true)
    assert.equal(needsFolioBreakBetween('Hello\n\n//break page', '# Chapter'), false)
    assert.equal(needsFolioBreakBetween('Hello', '//break page\n\n# Chapter'), false)
    assert.equal(needsFolioBreakBetween('', '# Chapter'), false)
  })
})

describe('resolveSpineFileUrl', () => {
  const root = 'https://example.test/book/book.md'

  it('resolves a relative child', () => {
    assert.equal(
      resolveSpineFileUrl(root, 'chapters/01.md'),
      'https://example.test/book/chapters/01.md'
    )
  })

  it('rejects traversal and absolute URLs', () => {
    assert.throws(() => resolveSpineFileUrl(root, '../secret.md'), /not allowed/)
    assert.throws(() => resolveSpineFileUrl(root, '/etc/passwd'), /not allowed/)
    assert.throws(() => resolveSpineFileUrl(root, 'https://evil.test/x.md'), /relative/)
  })
})
