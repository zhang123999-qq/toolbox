import { describe, expect, it } from 'vitest'
import {
  EXTENSION_TO_MIME,
  MAX_FILE_BYTES,
  downloadReport,
  extensionOf,
  extensionsForMime,
  lookupByExtension,
  lookupFile,
  lookupText,
  normalizeExtension,
  sniffMime,
  verdict,
} from './utils'

const pngHead = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const pdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])

describe('file-mime / 扩展名查询', () => {
  it('normalizeExtension 归一', () => {
    expect(normalizeExtension('png')).toBe('.png')
    expect(normalizeExtension('.PNG')).toBe('.png')
    expect(normalizeExtension('  jpg ')).toBe('.jpg')
    expect(normalizeExtension('')).toBe('')
  })

  it('lookupByExtension 命中与未命中', () => {
    expect(lookupByExtension('png')).toBe('image/png')
    expect(lookupByExtension('.PDF')).toBe('application/pdf')
    expect(lookupByExtension('xyz123')).toBeNull()
    expect(lookupByExtension('')).toBeNull()
  })

  it('extensionsForMime 反向列举', () => {
    expect(extensionsForMime('image/jpeg')).toEqual(['.jpeg', '.jpg'])
    expect(extensionsForMime('IMAGE/PNG')).toEqual(['.png'])
    expect(extensionsForMime('application/x-unknown')).toEqual([])
  })

  it('lookupText：命中含别名', () => {
    const out = lookupText('jpg')
    expect(out).toContain('.jpg → image/jpeg')
    expect(out).toContain('.jpeg')
  })

  it('lookupText：未收录中文报错', () => {
    expect(() => lookupText('xyz123')).toThrow(/未收录/)
    expect(() => lookupText('   ')).toThrow(/请输入/)
  })
})

describe('file-mime / 文件头嗅探', () => {
  it('sniffMime 识别 PNG / PDF', () => {
    expect(sniffMime(pngHead)).toBe('image/png')
    expect(sniffMime(pdfHead)).toBe('application/pdf')
  })

  it('未命中返回 null', () => {
    expect(sniffMime(new Uint8Array([1, 2, 3]))).toBeNull()
    expect(sniffMime(new Uint8Array(0))).toBeNull()
  })
})

describe('file-mime / 校对', () => {
  it('extensionOf 取扩展名', () => {
    expect(extensionOf('a.png')).toBe('.png')
    expect(extensionOf('a.PDF')).toBe('.pdf')
    expect(extensionOf('README')).toBe('')
    expect(extensionOf('.gitignore')).toBe('')
  })

  it('verdict 四种结论', () => {
    expect(verdict('.png', 'image/png')).toContain('一致')
    expect(verdict('.png', 'application/pdf')).toContain('不一致')
    expect(verdict('.png', null)).toContain('无法识别')
    expect(verdict('.xyz123', 'image/png')).toContain('未收录')
    expect(verdict('', 'image/png')).toContain('未收录')
  })
})

describe('file-mime / 文件查询', () => {
  it('一致的文件：扩展名与文件头都命中', async () => {
    const f = new File([pngHead], 'a.png', { type: 'image/png' })
    const out = await lookupFile(f)
    expect(out).toContain('一致')
    expect(out).toContain('image/png')
  })

  it('改名文件：扩展名与文件头不一致', async () => {
    const f = new File([pdfHead], 'fake.png')
    const out = await lookupFile(f)
    expect(out).toContain('不一致')
  })

  it('无扩展名文件：扩展名显示（无）', async () => {
    const f = new File([pngHead], 'README')
    const out = await lookupFile(f)
    expect(out).toContain('（无）')
    expect(out).toContain('未收录')
  })

  it('未收录扩展名 + 未知文件头', async () => {
    const f = new File([new Uint8Array([0x01, 0x02, 0x03])], 'a.xyz123')
    const out = await lookupFile(f)
    expect(out).toContain('未收录')
    expect(out).toContain('无法识别')
  })

  it('空文件中文报错', async () => {
    await expect(lookupFile(new File([], 'e.bin'))).rejects.toThrow(/为空/)
  })

  it('超大文件直接报错', async () => {
    const big = { name: 'b.bin', size: MAX_FILE_BYTES + 1 } as File
    await expect(lookupFile(big)).rejects.toThrow(/超过/)
  })

  it('downloadReport 走 hooks', () => {
    const calls: string[] = []
    downloadReport('report', {
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
    expect(calls).toEqual(['create', 'click:blob:u:mime-lookup.txt', 'revoke'])
  })

  it('映射表规模合理', () => {
    expect(Object.keys(EXTENSION_TO_MIME).length).toBeGreaterThan(40)
  })
})
