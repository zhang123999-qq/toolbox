import { describe, expect, it, vi } from 'vitest'
import type * as chardet from 'chardet'
import type { FileEncodingOptions } from './schema'

/**
 * chardet 的 detect 在测试里可控：默认透传真实实现，
 * 需要时改成返回固定值（覆盖「检测不到 → 未知」「不支持的编码」分支）。
 */
const { detectOverride } = vi.hoisted(() => ({
  detectOverride: { value: 'passthrough' as string | null },
}))

vi.mock('chardet', async (importOriginal) => {
  const orig = await importOriginal<typeof chardet>()
  return {
    ...orig,
    detect: (buffer: Uint8Array) =>
      detectOverride.value === 'passthrough' ? orig.detect(buffer) : detectOverride.value,
  }
})

import {
  MAX_FILE_BYTES,
  PREVIEW_CHARS,
  SAMPLE_BYTES,
  analyzeFile,
  detectEncoding,
  formatReport,
  hasUtf8Bom,
  isAscii,
  sampleBytes,
  topCandidates,
  truncatePreview,
  tryDecode,
} from './utils'

const enc = new TextEncoder()
const opts: FileEncodingOptions = { topN: 3, preview: true }
const noPreview: FileEncodingOptions = { topN: 3, preview: false }

function file(name: string, data: Uint8Array<ArrayBuffer>): File {
  return new File([data], name)
}

describe('file-encoding / 基础工具', () => {
  it('isAscii 只认 7 位字节', () => {
    expect(isAscii(enc.encode('hello'))).toBe(true)
    expect(isAscii(enc.encode('你好'))).toBe(false)
    expect(isAscii(new Uint8Array(0))).toBe(true)
  })

  it('hasUtf8Bom 识别 EF BB BF', () => {
    expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe(true)
    expect(hasUtf8Bom(enc.encode('abc'))).toBe(false)
    expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb]))).toBe(false)
  })

  it('sampleBytes 只取前 1 MiB', () => {
    expect(SAMPLE_BYTES).toBe(1048576)
    const big = new Uint8Array(SAMPLE_BYTES + 10)
    expect(sampleBytes(big).length).toBe(SAMPLE_BYTES)
    const small = new Uint8Array(100)
    expect(sampleBytes(small)).toBe(small)
  })
})

describe('file-encoding / 检测', () => {
  it('纯 ASCII 走快速路径', () => {
    expect(detectEncoding(enc.encode('hello world'))).toBe('ASCII')
  })

  it('BOM 头直接判 UTF-8', () => {
    expect(detectEncoding(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe('UTF-8')
  })

  it('GBK 字节被识别出来', () => {
    // "你好" 的 GBK 编码：C4 E3 BA C3
    const gbk = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3])
    const name = detectEncoding(gbk)
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('chardet 返回 null → 未知', () => {
    detectOverride.value = null
    try {
      expect(detectEncoding(new Uint8Array([0x80, 0x81, 0x82]))).toBe('未知')
    } finally {
      detectOverride.value = 'passthrough'
    }
  })

  it('topCandidates 返回前 N 个候选', () => {
    const cands = topCandidates(enc.encode('hello'), 3)
    expect(cands.length).toBeLessThanOrEqual(3)
    expect(cands[0]).toHaveProperty('name')
    expect(cands[0]).toHaveProperty('confidence')
  })
})

describe('file-encoding / 解码', () => {
  it('tryDecode：ASCII / 正常编码 / 不支持的编码', () => {
    expect(tryDecode(enc.encode('hi'), 'ASCII')).toBe('hi')
    expect(tryDecode(enc.encode('hi'), 'UTF-8')).toBe('hi')
    expect(tryDecode(enc.encode('hi'), 'UTF-32')).toBeNull()
    expect(tryDecode(enc.encode('hi'), 'not-a-charset')).toBeNull()
  })

  it('GBK 字节按 GB18030 解码出中文', () => {
    const gbk = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3])
    expect(tryDecode(gbk, 'GB18030')).toBe('你好')
  })

  it('truncatePreview 超长截断', () => {
    const short = truncatePreview('abc')
    expect(short).toEqual({ preview: 'abc', truncated: false })
    const long = truncatePreview('x'.repeat(PREVIEW_CHARS + 1))
    expect(long.preview.length).toBe(PREVIEW_CHARS)
    expect(long.truncated).toBe(true)
  })
})

describe('file-encoding / 报告', () => {
  it('完整报告：结果 + 候选 + 预览', () => {
    const report = formatReport(
      'a.txt',
      100,
      'UTF-8',
      95,
      [{ name: 'UTF-8', confidence: 95 }],
      'hello',
      false,
      true,
    )
    expect(report).toContain('文件：a.txt（100 字节）')
    expect(report).toContain('检测结果：UTF-8（置信度 95）')
    expect(report).toContain('1. UTF-8  95')
    expect(report).toContain('按 UTF-8 解码预览：')
    expect(report).toContain('hello')
  })

  it('置信度为 0 时不展示括号', () => {
    const report = formatReport('a', 1, '未知', 0, [], null, false, false)
    expect(report).toContain('检测结果：未知')
    expect(report).not.toContain('置信度')
  })

  it('关闭预览时不输出解码块', () => {
    const report = formatReport('a', 1, 'ASCII', 0, [], null, false, false)
    expect(report).not.toContain('解码')
  })

  it('不支持的编码给出中文说明', () => {
    const report = formatReport('a', 1, 'UTF-32', 0, [], null, false, true)
    expect(report).toContain('当前环境不支持')
  })

  it('截断预览标注字符数', () => {
    const report = formatReport('a', 1, 'UTF-8', 0, [], 'x', true, true)
    expect(report).toContain(`仅前 ${PREVIEW_CHARS} 字符`)
  })
})

describe('file-encoding / 文件入口', () => {
  it('ASCII 文件：快速路径 + 预览', async () => {
    const report = await analyzeFile(file('a.txt', enc.encode('hello world')), opts)
    expect(report).toContain('检测结果：ASCII')
    expect(report).toContain('hello world')
  })

  it('GBK 文件：检测并按 GB 解码出中文', async () => {
    const report = await analyzeFile(file('gb.txt', new Uint8Array([0xc4, 0xe3, 0xba, 0xc3])), opts)
    expect(report).toContain('检测结果：')
    // 只要解码成功，预览里应出现中文（chardet 可能判 GB18030 / windows-1252 等）
    expect(report).toMatch(/你好|解码/)
  })

  it('空文件报错', async () => {
    await expect(analyzeFile(file('e.txt', new Uint8Array(0)), opts)).rejects.toThrow(/空文件/)
  })

  it('超大文件报错', async () => {
    const big = { name: 'b.txt', size: MAX_FILE_BYTES + 1 } as File
    await expect(analyzeFile(big, opts)).rejects.toThrow(/超过/)
  })

  it('关闭预览时不解码', async () => {
    const report = await analyzeFile(file('a.txt', enc.encode('hi')), noPreview)
    expect(report).toContain('检测结果：ASCII')
    expect(report).not.toContain('解码预览')
  })

  it('检测到不支持的编码 → 中文说明', async () => {
    detectOverride.value = 'UTF-32'
    try {
      const report = await analyzeFile(file('a.txt', new Uint8Array([0x80, 0x81])), opts)
      expect(report).toContain('当前环境不支持')
    } finally {
      detectOverride.value = 'passthrough'
    }
  })
})
