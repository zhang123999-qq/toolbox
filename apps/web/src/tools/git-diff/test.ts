import { describe, expect, it } from 'vitest'
import type { GitDiffOptions } from './schema'
import { parseDiff, transform } from './utils'

const opts: GitDiffOptions = { verbose: false }

const SAMPLE = [
  'diff --git a/src/a.ts b/src/a.ts',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,3 +1,4 @@',
  ' ctx',
  '-remove me',
  '+add me',
  '+add two',
  ' ctx',
  'diff --git a/new.txt b/new.txt',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/new.txt',
  '@@ -0,0 +1 @@',
  '+hello',
].join('\n')

describe('git-diff / parseDiff', () => {
  it('识别两个文件并统计增删行', () => {
    const s = parseDiff(SAMPLE)
    expect(s.files.length).toBe(2)
    expect(s.totalAdded).toBe(3)
    expect(s.totalRemoved).toBe(1)
  })

  it('new file 记为新增，普通文件记为修改', () => {
    const s = parseDiff(SAMPLE)
    expect(s.files[0]?.status).toBe('modified')
    expect(s.files[1]?.status).toBe('added')
    expect(s.files[0]?.path).toBe('src/a.ts')
  })

  it('+++ / --- 表头不计入增删', () => {
    const s = parseDiff(SAMPLE)
    for (const f of s.files) expect(f.added + f.removed).toBeGreaterThan(0)
  })

  it('内容行本身以 + / - 开头仍计入增删（++foo / --bar）', () => {
    const text = [
      'diff --git a/f.txt b/f.txt',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,2 +1,2 @@',
      ' ctx',
      '--old-dash',
      '++new-plus',
    ].join('\n')
    const s = parseDiff(text)
    expect(s.files[0]?.added).toBe(1)
    expect(s.files[0]?.removed).toBe(1)
  })

  it('非法 diff 抛中文错误', () => {
    expect(() => parseDiff('hello world\nno diff here')).toThrow(/不是合法的 git diff/)
  })
})

describe('git-diff / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts)).toBe('')
  })

  it('输出汇总表', () => {
    const out = transform({ text: SAMPLE }, opts)
    expect(out).toContain('变更文件：2 个')
    expect(out).toContain('新增行：+3')
    expect(out).toContain('删除行：-1')
    expect(out).toContain('src/a.ts | 修改 | +2 | -1')
  })

  it('verbose 追加说明', () => {
    expect(transform({ text: SAMPLE }, { verbose: true })).toContain('# 说明')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, opts)).toThrow(/上限/)
  })
})
