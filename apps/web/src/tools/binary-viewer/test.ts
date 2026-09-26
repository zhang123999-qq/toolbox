import { describe, expect, it } from 'vitest'
import {
  BinaryViewError,
  MAX_DUMP_BYTES,
  bytesFromHex,
  bytesFromText,
  detectMagic,
  describeBytes,
  describeFile,
  dumpBytes,
  entropy,
  humanSize,
  statsOf,
  transform,
} from './utils'
import type { BinaryViewerInput, BinaryViewerOptions } from './schema'

const view16: BinaryViewerOptions = { direction: 'view', columns: '16' }
const hex16: BinaryViewerOptions = { direction: 'fromHex', columns: '16' }

const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

describe('binary-viewer / transform', () => {
  it('view 模式输出偏移、十六进制与 ASCII 三栏', () => {
    const out = transform({ text: 'AB' }, view16)
    expect(out).toContain('来源：输入文本的 UTF-8 字节（2 字节）')
    expect(out).toContain('00000000  41 42')
    expect(out).toContain('|AB|')
  })

  it('不可打印字节在 ASCII 栏显示为点', () => {
    const out = dumpBytes(Uint8Array.from([0x00, 0x41, 0xff]), 16)
    expect(out).toContain('00 41 ff')
    expect(out).toContain('|.A.|')
  })

  it('fromHex 能从带偏移列与 ASCII 栏的 xxd 输出里还原字节', () => {
    const input: BinaryViewerInput = {
      text: '00000000  89 50 4e 47 0d 0a 1a 0a  |.PNG....|\n00000008  00  |.|',
    }
    const out = transform(input, hex16)
    expect(out).toContain('还原出 9 字节')
    expect(out).toContain('00000000')
    expect(out).toContain('89 50 4e 47 0d 0a 1a 0a 00')
    expect(out).toContain('|.PNG.....|')
  })

  it('fromHex 也接受不带格式的纯十六进制串', () => {
    expect([...bytesFromHex('89504e47')]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect([...bytesFromHex('89:50 4e-47')]).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  it('columns 决定每行字节数', () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(dumpBytes(bytes, 8).split('\n')[0]).toContain('01 02 03 04 05 06 07 08')
    expect(dumpBytes(bytes, 8).split('\n')[1]).toContain('00000008  09')
    expect(dumpBytes(bytes, 32).split('\n')).toHaveLength(1)
  })

  it('超过转储上限时截断并标注总量（边界）', () => {
    const bytes = new Uint8Array(MAX_DUMP_BYTES + 100).fill(0x41)
    const lines = dumpBytes(bytes, 16).split('\n')
    expect(lines[lines.length - 1]).toContain('仅显示前 65,536 字节')
    expect(lines[lines.length - 1]).toContain('共 65,636 字节')
  })

  it('统计区块给出总量、可打印占比与熵', () => {
    const stats = statsOf(bytesFromText('AAAA'))
    expect(stats.total).toBe(4)
    expect(stats.distinct).toBe(1)
    expect(stats.printable).toBe(4)
    expect(stats.entropy).toBeCloseTo(0, 5)
    const out = describeBytes('来源：测试', bytesFromText('A\u0000'), view16)
    expect(out).toContain('零字节 0x00: 1（50.0%）')
    expect(out).toContain('香农熵:')
  })

  it('高随机数据的熵接近 8（边界）', () => {
    const bytes = new Uint8Array(1024)
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 256
    expect(entropy(bytes)).toBeCloseTo(8, 5)
  })

  it('按文件头识别常见格式', () => {
    expect(detectMagic(PNG_HEADER)).toBe('PNG 图片')
    expect(detectMagic(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('PDF 文档')
    expect(detectMagic(bytesFromText('hello'))).toContain('未命中')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, view16)).toBe('')
    expect(transform({ text: '   \n ' }, hex16)).toBe('')
  })

  it('hex 长度为奇数时抛 BinaryViewError（异常）', () => {
    expect(() => transform({ text: 'abc' }, hex16)).toThrow(BinaryViewError)
    expect(() => transform({ text: 'abc' }, hex16)).toThrow(/长度必须是偶数/)
  })

  it('超长输入抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: 'a'.repeat(1_000_001) }, view16)).toThrow(BinaryViewError)
  })

  it('文件模式返回带文件名与体积的报告', async () => {
    const file = new File([new Uint8Array(PNG_HEADER)], 'demo.png', { type: 'image/png' })
    const out = await describeFile(file, view16)
    expect(out).toContain('文件：demo.png')
    expect(out).toContain('大小：9 字节（9 B）')
    expect(out).toContain('PNG 图片')
    expect(out).toContain('00000000')
  })

  it('humanSize 逐级换算单位', () => {
    expect(humanSize(0)).toBe('0 B')
    expect(humanSize(1024)).toBe('1.00 KiB')
    expect(humanSize(1536)).toBe('1.50 KiB')
    expect(humanSize(5 * 1024 * 1024)).toBe('5.00 MiB')
  })
})
