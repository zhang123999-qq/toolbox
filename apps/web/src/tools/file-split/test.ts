import { describe, expect, it } from 'vitest'
import type { FileSplitOptions } from './schema'
import {
  MAX_FILE_BYTES,
  MAX_PARTS,
  downloadBytes,
  formatPlan,
  formatSize,
  parseCountInput,
  parseSizeInput,
  partFileName,
  planSplit,
  splitBytes,
  splitFile,
  splitName,
} from './utils'

const bySize: FileSplitOptions = { mode: 'size' }
const byCount: FileSplitOptions = { mode: 'count' }

describe('file-split / 参数解析', () => {
  it('parseSizeInput 识别 B/KB/MB/GB 与小数', () => {
    expect(parseSizeInput('1024')).toBe(1024)
    expect(parseSizeInput('512KB')).toBe(512 * 1024)
    expect(parseSizeInput('10MB')).toBe(10 * 1024 * 1024)
    expect(parseSizeInput('1.5GB')).toBe(Math.floor(1.5 * 1024 ** 3))
    expect(parseSizeInput(' 10 mb ')).toBe(10 * 1024 * 1024)
    expect(parseSizeInput('100b')).toBe(100)
  })

  it('parseSizeInput 非法格式中文报错', () => {
    for (const bad of ['', 'abc', '10XB', '-5MB', '1.2.3MB', 'MB']) {
      expect(() => parseSizeInput(bad)).toThrow(/格式不正确/)
    }
    expect(() => parseSizeInput('0MB')).toThrow(/大于 0/)
    expect(() => parseSizeInput('0')).toThrow(/大于 0/)
  })

  it('parseCountInput 只要正整数', () => {
    expect(parseCountInput('5')).toBe(5)
    expect(parseCountInput(' 3 ')).toBe(3)
    expect(() => parseCountInput('0')).toThrow(/正整数/)
    expect(() => parseCountInput('2.5')).toThrow(/正整数/)
    expect(() => parseCountInput('abc')).toThrow(/正整数/)
    expect(() => parseCountInput('')).toThrow(/正整数/)
    expect(() => parseCountInput(String(MAX_PARTS + 1))).toThrow(/不能超过/)
  })
})

describe('file-split / 切分方案', () => {
  it('按大小：向上取整算片数', () => {
    expect(planSplit(2500, bySize, '1KB')).toEqual({ sizes: [1024, 1024, 452] })
    expect(planSplit(2048, bySize, '1KB')).toEqual({ sizes: [1024, 1024] })
  })

  it('按大小比分片还小 → 只有 1 片', () => {
    expect(planSplit(100, bySize, '1MB').sizes).toEqual([100])
  })

  it('片数超限中文报错', () => {
    expect(() => planSplit(10 * 1024 * 1024, bySize, '1B')).toThrow(/超过/)
  })

  it('按数量：每片大小向上取整', () => {
    expect(planSplit(1000, byCount, '3')).toEqual({ sizes: [334, 333, 333] })
    expect(planSplit(1000, byCount, '1')).toEqual({ sizes: [1000] })
  })

  it('按数量余数均摊：16 字节切 5 片精确成片', () => {
    expect(planSplit(16, byCount, '5')).toEqual({ sizes: [4, 3, 3, 3, 3] })
  })

  it('分片数超过字节数中文报错', () => {
    expect(() => planSplit(10, byCount, '20')).toThrow(/超过文件字节数/)
  })

  it('空文件直接报错', () => {
    expect(() => planSplit(0, bySize, '1KB')).toThrow(/空文件/)
    expect(() => planSplit(0, byCount, '5')).toThrow(/空文件/)
  })

  it('非法参数透出中文错', () => {
    expect(() => planSplit(1000, bySize, 'zzz')).toThrow(/格式不正确/)
    expect(() => planSplit(1000, byCount, 'zzz')).toThrow(/正整数/)
  })
})

describe('file-split / 切分与命名', () => {
  it('splitBytes 按片大小切分，最后一片可不足', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    const parts = splitBytes(bytes, 2)
    expect(parts.map((p) => Array.from(p))).toEqual([[1, 2], [3, 4], [5]])
  })

  it('splitBytes 空数组返回空数组', () => {
    expect(splitBytes(new Uint8Array(0), 1024)).toEqual([])
  })

  it('splitName 拆出 base 与 ext', () => {
    expect(splitName('report.pdf')).toEqual({ base: 'report', ext: '.pdf' })
    expect(splitName('archive.tar.gz')).toEqual({ base: 'archive.tar', ext: '.gz' })
    expect(splitName('README')).toEqual({ base: 'README', ext: '' })
    expect(splitName('.gitignore')).toEqual({ base: '.gitignore', ext: '' })
  })

  it('partFileName 序号按总片数对齐', () => {
    expect(partFileName('a.pdf', 0, 5)).toBe('a.part1.pdf')
    expect(partFileName('a.pdf', 9, 120)).toBe('a.part010.pdf')
    expect(partFileName('README', 1, 3)).toBe('README.part2')
  })
})

describe('file-split / 完整流程', () => {
  it('splitFile：切分 + 命名 + 内容可拼接还原', async () => {
    const content = new TextEncoder().encode('0123456789')
    const f = new File([content], 'data.bin')
    const parts = await splitFile(f, bySize, '4B')
    expect(parts.map((p) => p.name)).toEqual(['data.part1.bin', 'data.part2.bin', 'data.part3.bin'])
    const restored = Buffer.concat(parts.map((p) => Buffer.from(p.data)))
    expect(restored.equals(Buffer.from(content))).toBe(true)
  })

  it('按数量切分', async () => {
    const f = new File([new Uint8Array(10)], 'x.bin')
    const parts = await splitFile(f, byCount, '4')
    expect(parts).toHaveLength(4)
    expect(parts[0]?.data.length).toBe(3)
  })

  it('超大文件直接报错', async () => {
    const big = { name: 'b.bin', size: MAX_FILE_BYTES + 1 } as unknown as File
    await expect(splitFile(big, bySize, '1MB')).rejects.toThrow(/超过/)
  })

  it('空文件报错', async () => {
    const empty = new File([], 'e.bin')
    await expect(splitFile(empty, bySize, '1KB')).rejects.toThrow(/空文件/)
  })

  it('formatPlan 含模式、数量与清单', () => {
    const parts = [
      { index: 0, name: 'a.part1.bin', data: new Uint8Array(4) },
      { index: 1, name: 'a.part2.bin', data: new Uint8Array(2) },
    ]
    const report = formatPlan('a.bin', 6, parts, bySize)
    expect(report).toContain('按大小')
    expect(report).toContain('2 个分片')
    expect(report).toContain('1. a.part1.bin')
  })

  it('formatPlan 按数量模式', () => {
    const report = formatPlan('a.bin', 6, [], byCount)
    expect(report).toContain('按数量')
  })

  it('formatSize 分支', () => {
    expect(formatSize(500)).toBe('500 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024 * 1024)).toBe('5.00 GiB')
  })

  it('downloadBytes 走 hooks', () => {
    const calls: string[] = []
    downloadBytes('a.part1.bin', new Uint8Array([1]), 'application/octet-stream', {
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
    expect(calls).toEqual(['create', 'click:blob:u:a.part1.bin', 'revoke'])
  })
})
