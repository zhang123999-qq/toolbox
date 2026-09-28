import { describe, expect, it } from 'vitest'
import type { FileCompareOptions } from './schema'
import {
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  MODES,
  compareFiles,
  diffTexts,
  formatSummary,
  formatUnified,
  isBinary,
  normalize,
  readTextFile,
  summarize,
} from './utils'

const line: FileCompareOptions = { mode: 'line', ignoreWhitespace: false }
const lineTrim: FileCompareOptions = { mode: 'line', ignoreWhitespace: true }
const char: FileCompareOptions = { mode: 'char', ignoreWhitespace: false }
const word: FileCompareOptions = { mode: 'word', ignoreWhitespace: false }

function file(name: string, content: string): File {
  return new File([new TextEncoder().encode(content)], name, { type: 'text/plain' })
}

describe('file-compare / 基础工具', () => {
  it('粒度白名单', () => {
    expect(MODES).toEqual(['line', 'char', 'word'])
  })

  it('normalize：忽略空白时行首尾空白归一', () => {
    expect(normalize('  a  \n\tb\t', true)).toBe('a\nb')
    expect(normalize('  a  ', false)).toBe('  a  ')
  })

  it('isBinary：NUL 字节判定', () => {
    expect(isBinary(new Uint8Array([104, 105]))).toBe(false)
    expect(isBinary(new Uint8Array([104, 0, 105]))).toBe(true)
    expect(isBinary(new Uint8Array(0))).toBe(false)
  })
})

describe('file-compare / diffTexts', () => {
  it('行模式：改了一行 → 一删一加', () => {
    const rows = diffTexts('a\nb\nc', 'a\nB\nc', line)
    expect(rows).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'add', text: 'B' },
      { type: 'same', text: 'c' },
    ])
  })

  it('完全相同 → 全 same', () => {
    const rows = diffTexts('x\ny', 'x\ny', line)
    expect(rows.every((r) => r.type === 'same')).toBe(true)
    expect(rows).toHaveLength(2)
  })

  it('空 vs 有内容', () => {
    const rows = diffTexts('', 'a\nb', line)
    expect(rows).toEqual([
      { type: 'add', text: 'a' },
      { type: 'add', text: 'b' },
    ])
  })

  it('忽略空白后差异消失', () => {
    const rows = diffTexts('a  \n b', 'a\nb', lineTrim)
    expect(rows.every((r) => r.type === 'same')).toBe(true)
  })

  it('字符模式按片段切分', () => {
    const rows = diffTexts('abc', 'aXc', char)
    expect(rows).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'add', text: 'X' },
      { type: 'same', text: 'c' },
    ])
  })

  it('词模式按词切分', () => {
    const rows = diffTexts('hello world', 'hello there', word)
    const types = rows.map((r) => r.type)
    expect(types).toContain('del')
    expect(types).toContain('add')
    expect(rows.map((r) => r.text).join('')).toBe('hello worldthere')
  })

  it('末尾换行不产生空行', () => {
    const rows = diffTexts('a\n', 'a\nb\n', line)
    expect(rows[rows.length - 1]).toEqual({ type: 'add', text: 'b' })
  })
})

describe('file-compare / 统计与报告', () => {
  it('summarize 行模式按行计数', () => {
    const rows = diffTexts('a\nb', 'a\nc\nd', line)
    const stats = summarize(rows, 'line')
    expect(stats).toEqual({ added: 2, removed: 1, unchanged: 1, identical: false })
  })

  it('summarize 字符模式按字符计数', () => {
    const rows = diffTexts('ab', 'aX', char)
    const stats = summarize(rows, 'char')
    expect(stats.added).toBe(1)
    expect(stats.removed).toBe(1)
    expect(stats.unchanged).toBe(1)
    expect(stats.identical).toBe(false)
  })

  it('相同文件 identical 为 true', () => {
    const stats = summarize(diffTexts('a', 'a', line), 'line')
    expect(stats.identical).toBe(true)
  })

  it('formatUnified 用 +/- 标记', () => {
    const rows = diffTexts('a\nb', 'a\nc', line)
    const stats = summarize(rows, 'line')
    const out = formatUnified(rows, 'old.txt', 'new.txt', stats)
    expect(out).toContain('--- old.txt')
    expect(out).toContain('+++ new.txt')
    expect(out).toContain('-b')
    expect(out).toContain('+c')
    expect(out).toContain(' a')
  })

  it('formatUnified 相同文件首行说明', () => {
    const rows = diffTexts('a', 'a', line)
    const out = formatUnified(rows, 'a.txt', 'b.txt', summarize(rows, 'line'))
    expect(out).toContain('完全相同')
  })

  it('formatSummary 两种形态', () => {
    const same = summarize(diffTexts('a', 'a', line), 'line')
    expect(formatSummary('a', 'b', same)).toContain('完全相同')
    const diff = summarize(diffTexts('a', 'b', line), 'line')
    expect(formatSummary('old', 'new', diff)).toContain('新增 1，删除 1')
  })
})

describe('file-compare / 文件读取', () => {
  it('readTextFile 正常解码', async () => {
    await expect(readTextFile(file('a.txt', 'hello'))).resolves.toBe('hello')
  })

  it('超大文件报错', async () => {
    const big = { name: 'big.txt', size: MAX_FILE_BYTES + 1 } as File
    await expect(readTextFile(big)).rejects.toThrow(/超过 200 MiB/)
  })

  it('二进制文件拦截', async () => {
    const bin = new File([new Uint8Array([1, 0, 2])], 'b.bin')
    await expect(readTextFile(bin)).rejects.toThrow(/二进制/)
  })

  it('解码后超长拦截', async () => {
    const buf = new Uint8Array(MAX_TEXT_CHARS + 1).fill(0x61)
    const fake = {
      name: 'huge.txt',
      size: buf.length,
      arrayBuffer: async () => buf.buffer,
    } as unknown as File
    await expect(readTextFile(fake)).rejects.toThrow(/1000 万字符/)
  })

  it('compareFiles 端到端', async () => {
    const { rows, stats } = await compareFiles(file('a.txt', 'x\ny'), file('b.txt', 'x\nz'), line)
    expect(stats.added).toBe(1)
    expect(stats.removed).toBe(1)
    expect(rows).toHaveLength(3)
  })

  it('MAX_TEXT_CHARS 常量为 1000 万', () => {
    expect(MAX_TEXT_CHARS).toBe(10_000_000)
  })
})
