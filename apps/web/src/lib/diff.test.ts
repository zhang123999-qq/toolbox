/**
 * lib/diff 单测。
 *
 * #35 文本 Diff、#51 差异高亮、#65 文本比较都走这两个函数；
 * 这里的重点是「+/-/空格」这套纯文本约定的稳定性——它是工具间共用的输出格式。
 */
import { describe, expect, it } from 'vitest'
import { changesOf, signedDiff } from './diff'

describe('diff / changesOf', () => {
  it('字符级差异能指出改动的那一段', () => {
    const changes = changesOf('abc', 'abd', 'char')
    expect(changes.some((change) => change.removed && change.value === 'c')).toBe(true)
    expect(changes.some((change) => change.added && change.value === 'd')).toBe(true)
  })

  it('完全相同的内容没有增删片段', () => {
    expect(
      changesOf('abc', 'abc', 'char').every((change) => !change.added && !change.removed),
    ).toBe(true)
  })

  it('行级差异按行切分', () => {
    const changes = changesOf('a\nb\n', 'a\nc\n', 'line')
    expect(changes.some((change) => change.value === 'b\n')).toBe(true)
    expect(changes.some((change) => change.value === 'c\n')).toBe(true)
  })
})

describe('diff / signedDiff', () => {
  it('新增用 +、删除用 -、未变用空格', () => {
    const out = signedDiff('ab', 'ac', 'char')
    expect(out).toContain('+ c')
    expect(out).toContain('- b')
  })

  it('每行都带一个前缀字符', () => {
    const lines = signedDiff('a\nb', 'a\nc', 'line').split('\n')
    for (const line of lines) {
      expect(['+', '-', ' ']).toContain(line[0])
    }
  })

  it('diffLines 末尾的换行不会被渲染成多余空行', () => {
    expect(signedDiff('a\nb', 'a\nb', 'line').endsWith('\n\n')).toBe(false)
  })
})
