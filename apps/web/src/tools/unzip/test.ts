import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import type { ZipEntry } from './utils'
import {
  MAX_FILE_BYTES,
  analyzeFile,
  downloadBytes,
  entryByName,
  formatListing,
  formatSize,
  isDirectoryName,
  packAll,
  parseZip,
  totalUnpackedBytes,
} from './utils'

const enc = new TextEncoder()
const dec = new TextDecoder()

function makeZip(files: Record<string, string>): Uint8Array<ArrayBuffer> {
  const record: Record<string, Uint8Array> = {}
  for (const [name, text] of Object.entries(files)) record[name] = enc.encode(text)
  return zipSync(record)
}

function makeFile(name: string, data: Uint8Array<ArrayBuffer>): File {
  return new File([data], name, { type: 'application/zip' })
}

describe('unzip / 基础工具', () => {
  it('目录名以 / 结尾判定', () => {
    expect(isDirectoryName('dir/')).toBe(true)
    expect(isDirectoryName('dir')).toBe(false)
    expect(isDirectoryName('')).toBe(false)
  })

  it('体积格式化', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(3 * 1024 * 1024 * 1024)).toBe('3.00 GiB')
  })

  it('totalUnpackedBytes 只计文件不计目录', () => {
    const entries: ZipEntry[] = [
      { name: 'a.txt', size: 3, isDir: false, data: new Uint8Array(3) },
      { name: 'd/', size: 0, isDir: true, data: new Uint8Array(0) },
    ]
    expect(totalUnpackedBytes(entries)).toBe(3)
  })
})

describe('unzip / 解析', () => {
  it('正常 zip 解析出条目且内容一致', () => {
    const entries = parseZip(makeZip({ 'a.txt': 'hello', 'dir/b.txt': 'world' }))
    expect(entries).toHaveLength(2)
    const a = entryByName(entries, 'a.txt')
    expect(a?.isDir).toBe(false)
    expect(dec.decode(a?.data)).toBe('hello')
  })

  it('损坏 / 非 zip 数据报中文错', () => {
    expect(() => parseZip(enc.encode('这根本不是zip'))).toThrow(/不是有效的 ZIP 文件/)
    expect(() => parseZip(new Uint8Array([0x50, 0x4b, 0x03]))).toThrow(/不是有效的 ZIP 文件/)
  })

  it('空 zip 解析出空数组', () => {
    expect(parseZip(zipSync({}))).toEqual([])
  })

  it('按名查找：命中与未命中', () => {
    const entries = parseZip(makeZip({ 'a.txt': 'x' }))
    expect(entryByName(entries, 'a.txt')?.name).toBe('a.txt')
    expect(entryByName(entries, 'missing.txt')).toBeUndefined()
  })
})

describe('unzip / 清单报告', () => {
  it('报告含包名、数量与逐条清单', () => {
    const entries = parseZip(makeZip({ 'a.txt': 'hello' }))
    const report = formatListing('pack.zip', entries, {})
    expect(report).toContain('压缩包：pack.zip')
    expect(report).toContain('共 1 个文件，0 个目录')
    expect(report).toContain('1. ［文件］ a.txt')
  })

  it('空包报告提示没有内容', () => {
    const report = formatListing('empty.zip', [], {})
    expect(report).toContain('压缩包为空')
  })

  it('目录条目标注［目录］', () => {
    const entries = parseZip(makeZip({ 'd/': '', 'd/a.txt': 'x' }))
    const report = formatListing('p.zip', entries, {})
    expect(report).toContain('［目录］ d/')
  })
})

describe('unzip / 文件入口', () => {
  it('analyzeFile 返回报告与条目', async () => {
    const { report, entries } = await analyzeFile(makeFile('p.zip', makeZip({ 'a.txt': 'hi' })), {})
    expect(report).toContain('压缩包：p.zip')
    expect(entries).toHaveLength(1)
  })

  it('超大文件直接报错不解析', async () => {
    const big = { name: 'big.zip', size: MAX_FILE_BYTES + 1 } as File
    await expect(analyzeFile(big, {})).rejects.toThrow(/超过/)
  })

  it('损坏的 zip 文件报中文错', async () => {
    const bad = makeFile('bad.zip', enc.encode('not a zip at all'))
    await expect(analyzeFile(bad, {})).rejects.toThrow(/不是有效的 ZIP/)
  })
})

describe('unzip / 打包与下载', () => {
  it('packAll 把文件条目重新打包（跳过目录）', () => {
    const entries: ZipEntry[] = [
      { name: 'a.txt', size: 2, isDir: false, data: enc.encode('hi') },
      { name: 'd/', size: 0, isDir: true, data: new Uint8Array(0) },
    ]
    const back = parseZip(packAll(entries))
    expect(back.map((e) => e.name)).toEqual(['a.txt'])
    expect(dec.decode(back[0]?.data)).toBe('hi')
  })

  it('downloadBytes 走 hooks 并回收 URL', () => {
    const calls: string[] = []
    downloadBytes('a.txt', enc.encode('x'), 'text/plain', {
      createObjectURL: () => {
        calls.push('create')
        return 'blob:u'
      },
      revokeObjectURL: () => {
        calls.push('revoke')
      },
      clickAnchor: (url, filename) => {
        calls.push(`click:${url}:${filename}`)
      },
    })
    expect(calls).toEqual(['create', 'click:blob:u:a.txt', 'revoke'])
  })

  it('click 抛错也回收 URL', () => {
    const revoked: string[] = []
    expect(() =>
      downloadBytes('a.txt', enc.encode('x'), 'text/plain', {
        createObjectURL: () => 'blob:u',
        revokeObjectURL: (u) => {
          revoked.push(u)
        },
        clickAnchor: () => {
          throw new Error('boom')
        },
      }),
    ).toThrow('boom')
    expect(revoked).toEqual(['blob:u'])
  })
})
