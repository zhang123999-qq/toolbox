import { describe, expect, it } from 'vitest'
import type { FileToBase64Options } from './schema'
import {
  MAX_FILE_BYTES,
  bytesToBase64,
  encodeFile,
  encodeText,
  formatHeader,
  mimeOf,
  toDataUrl,
  transform,
} from './utils'

const plain: FileToBase64Options = { dataUrl: false }
const withUrl: FileToBase64Options = { dataUrl: true }
const enc = new TextEncoder()

describe('file-to-base64 / 基础工具', () => {
  it('bytesToBase64 与 btoa 一致', () => {
    expect(bytesToBase64(enc.encode('hello'))).toBe(btoa('hello'))
    expect(bytesToBase64(new Uint8Array(0))).toBe('')
  })

  it('bytesToBase64 大字节数组分块不溢出', () => {
    const big = new Uint8Array(200000).fill(0x41)
    expect(bytesToBase64(big)).toBe(btoa('A'.repeat(200000)))
  })

  it('toDataUrl 拼装格式', () => {
    expect(toDataUrl('image/png', 'aGVsbG8=')).toBe('data:image/png;base64,aGVsbG8=')
  })

  it('mimeOf：空 type 回退', () => {
    expect(mimeOf({ type: 'image/png' })).toBe('image/png')
    expect(mimeOf({ type: '' })).toBe('application/octet-stream')
  })

  it('encodeText 按 UTF-8 编码', () => {
    expect(encodeText('hello')).toBe('aGVsbG8=')
    // 中文按 UTF-8 而非 UTF-16 编码：与 `echo -n 中文 | base64` 一致
    expect(encodeText('中文')).toBe('5Lit5paH')
  })

  it('formatHeader 两种形态', () => {
    expect(formatHeader('text', '', 5)).toBe('文本：5 字符')
    expect(formatHeader('file', 'a.png', 10)).toBe('文件：a.png（10 字节）')
  })
})

describe('file-to-base64 / transform（文本模式）', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, plain)).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(5_000_001) }, plain)).toThrow(/500 万字符/)
  })

  it('普通文本输出说明行 + Base64', () => {
    const out = transform({ text: 'hello' }, plain)
    expect(out).toBe('文本：5 字符\n\naGVsbG8=')
  })

  it('dataUrl 开关拼 DataURL', () => {
    const out = transform({ text: 'hi' }, withUrl)
    expect(out).toContain('data:text/plain;charset=utf-8;base64,')
  })
})

describe('file-to-base64 / encodeFile（文件模式）', () => {
  it('文件转 Base64 内容一致', async () => {
    const f = new File([enc.encode('hello')], 'a.txt', { type: 'text/plain' })
    const out = await encodeFile(f, plain)
    expect(out).toBe('文件：a.txt（5 字节）\n\naGVsbG8=')
  })

  it('dataUrl 开关带上文件 MIME', async () => {
    const f = new File([enc.encode('x')], 'a.png', { type: 'image/png' })
    const out = await encodeFile(f, withUrl)
    expect(out).toContain('data:image/png;base64,')
  })

  it('无 type 的文件回退 octet-stream', async () => {
    const f = new File([enc.encode('x')], 'a.bin')
    const out = await encodeFile(f, withUrl)
    expect(out).toContain('data:application/octet-stream;base64,')
  })

  it('超大文件直接报错', async () => {
    const big = { name: 'b.bin', size: MAX_FILE_BYTES + 1 } as File
    await expect(encodeFile(big, plain)).rejects.toThrow(/超过/)
  })
})
