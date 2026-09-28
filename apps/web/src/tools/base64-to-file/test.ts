import { describe, expect, it } from 'vitest'
import type { Base64ToFileOptions } from './schema'
import {
  MAX_BASE64_CHARS,
  cleanBase64,
  decodeBase64,
  decodeToFile,
  downloadBytes,
  formatReport,
  isValidBase64,
  normalizeExtension,
  normalizeFilename,
  resolveFilename,
  resolveMime,
  stripDataUrlPrefix,
} from './utils'

const enc = new TextEncoder()
const opts: Base64ToFileOptions = { filename: 'out', extension: '' }

describe('base64-to-file / 文本预处理', () => {
  it('stripDataUrlPrefix 剥离前缀并取出 MIME', () => {
    const { base64, mime } = stripDataUrlPrefix('data:image/png;base64,aGVsbG8=')
    expect(base64).toBe('aGVsbG8=')
    expect(mime).toBe('image/png')
  })

  it('无前缀原样返回', () => {
    expect(stripDataUrlPrefix('aGVsbG8=')).toEqual({ base64: 'aGVsbG8=', mime: null })
  })

  it('data: 无 MIME 时 mime 为 null', () => {
    const { mime } = stripDataUrlPrefix('data:;base64,aGVsbG8=')
    expect(mime).toBeNull()
  })

  it('cleanBase64 去掉空白', () => {
    expect(cleanBase64('aGVs\nbG8=\r\n')).toBe('aGVsbG8=')
  })

  it('isValidBase64 严格校验', () => {
    expect(isValidBase64('aGVsbG8=')).toBe(true)
    expect(isValidBase64('aGVsbG8')).toBe(false) // 长度不是 4 的倍数
    expect(isValidBase64('')).toBe(false)
    expect(isValidBase64('aGVsbG8===')).toBe(false) // 三个等号
    expect(isValidBase64('aGV*sbG8=')).toBe(false) // 非法字符
    expect(isValidBase64('YWJj')).toBe(true) // 无 padding 也合法
  })
})

describe('base64-to-file / 解码', () => {
  it('decodeBase64 还原字节', () => {
    expect(Array.from(decodeBase64('aGVsbG8='))).toEqual(Array.from(enc.encode('hello')))
  })

  it('带换行的 Base64 也能解', () => {
    expect(new TextDecoder().decode(decodeBase64('aGVs\nbG8='))).toBe('hello')
  })

  it('非法输入中文报错', () => {
    expect(() => decodeBase64('!!!')).toThrow(/不是合法的 Base64/)
    expect(() => decodeBase64('')).toThrow(/不是合法的 Base64/)
    expect(() => decodeBase64('abc')).toThrow(/不是合法的 Base64/)
  })
})

describe('base64-to-file / 文件名', () => {
  it('normalizeExtension 补点', () => {
    expect(normalizeExtension('png')).toBe('.png')
    expect(normalizeExtension('.png')).toBe('.png')
    expect(normalizeExtension('..png')).toBe('.png')
    expect(normalizeExtension('')).toBe('')
    expect(normalizeExtension('  ')).toBe('')
  })

  it('normalizeFilename 去路径、空回退', () => {
    expect(normalizeFilename('a/b/c')).toBe('c')
    expect(normalizeFilename('C:\\x\\y')).toBe('y')
    expect(normalizeFilename('')).toBe('decoded')
    expect(normalizeFilename('  ')).toBe('decoded')
    expect(normalizeFilename('pic')).toBe('pic')
  })

  it('resolveFilename：用户扩展名优先', () => {
    expect(resolveFilename({ filename: 'a', extension: 'jpg' }, 'image/png')).toBe('a.jpg')
  })

  it('resolveFilename：无扩展名时用 MIME 映射', () => {
    expect(resolveFilename(opts, 'image/png')).toBe('out.png')
    expect(resolveFilename(opts, 'application/pdf')).toBe('out.pdf')
    expect(resolveFilename(opts, 'IMAGE/PNG')).toBe('out.png')
  })

  it('resolveFilename：未知 MIME 回退 .bin', () => {
    expect(resolveFilename(opts, 'application/x-unknown')).toBe('out.bin')
    expect(resolveFilename(opts, null)).toBe('out.bin')
  })

  it('resolveMime 回退', () => {
    expect(resolveMime('image/png')).toBe('image/png')
    expect(resolveMime(null)).toBe('application/octet-stream')
  })
})

describe('base64-to-file / 完整流程', () => {
  it('decodeToFile：文本 → 文件', () => {
    const decoded = decodeToFile('aGVsbG8=', { filename: 'hi', extension: 'txt' })
    expect(decoded.filename).toBe('hi.txt')
    expect(new TextDecoder().decode(decoded.data)).toBe('hello')
    expect(decoded.mime).toBeNull()
  })

  it('data: URL：MIME 决定扩展名与下载类型', () => {
    const decoded = decodeToFile('data:image/png;base64,aGVsbG8=', opts)
    expect(decoded.filename).toBe('out.png')
    expect(decoded.mime).toBe('image/png')
  })

  it('空输入中文报错', () => {
    expect(() => decodeToFile('   ', opts)).toThrow(/请先粘贴/)
  })

  it('超长输入中文报错', () => {
    const long = 'A'.repeat(MAX_BASE64_CHARS + 1)
    expect(() => decodeToFile(long, opts)).toThrow(/超过/)
  })

  it('非法 Base64 透出中文错', () => {
    expect(() => decodeToFile('not base64!!', opts)).toThrow(/不是合法的 Base64/)
  })

  it('formatReport 含字节数与文件名', () => {
    const report = formatReport({ data: enc.encode('hello'), filename: 'hi.txt', mime: null }, 8)
    expect(report).toContain('8 字符 → 5 字节')
    expect(report).toContain('hi.txt')
  })

  it('downloadBytes 走 hooks', () => {
    const calls: string[] = []
    downloadBytes('hi.txt', enc.encode('hello'), 'text/plain', {
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
    expect(calls).toEqual(['create', 'click:blob:u:hi.txt', 'revoke'])
  })
})
