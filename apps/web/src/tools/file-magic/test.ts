import { describe, expect, it } from 'vitest'
import {
  HEADER_BYTES,
  MAX_FILE_BYTES,
  downloadReport,
  extensionOf,
  hexOf,
  identify,
  identifyFile,
  tamperVerdict,
  transform,
} from './utils'

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])
const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45])
const mp4 = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])
const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00])

describe('file-magic / 签名鉴定', () => {
  it('identify 识别 PNG / EXE', () => {
    expect(identify(png).type).toBe('PNG 图片')
    expect(identify(png).extension).toBe('.png')
    expect(identify(exe).type).toContain('EXE')
  })

  it('WebP 与 WAV 同为 RIFF 但能区分', () => {
    expect(identify(webp).extension).toBe('.webp')
    expect(identify(wav).extension).toBe('.wav')
  })

  it('MP4 按 ftyp 偏移命中', () => {
    expect(identify(mp4).extension).toBe('.mp4')
  })

  it('RIFF 头过短时 WebP 校验失败 → 回退 WAV', () => {
    const result = identify(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]))
    expect(result.extension).toBe('.wav')
  })

  it('未知签名返回 null 并给出十六进制头', () => {
    const result = identify(new Uint8Array([0x01, 0x02, 0x03]))
    expect(result.type).toBeNull()
    expect(result.signature).toBe('01 02 03')
  })

  it('hexOf 十六进制格式化', () => {
    expect(hexOf(new Uint8Array([0x0a, 0xff]))).toBe('0A FF')
    expect(hexOf(png, 4)).toBe('89 50 4E 47')
  })
})

describe('file-magic / 篡改判断', () => {
  it('extensionOf 取扩展名', () => {
    expect(extensionOf('a.PNG')).toBe('.png')
    expect(extensionOf('README')).toBe('')
  })

  it('tamperVerdict 五种结论', () => {
    expect(tamperVerdict('.png', '.png')).toContain('一致')
    expect(tamperVerdict('.jpg', '.png')).toContain('疑似篡改')
    expect(tamperVerdict('.png', null)).toContain('无法判断')
    expect(tamperVerdict('', '.png')).toContain('没有扩展名')
    expect(tamperVerdict('.exe', '')).toContain('可执行文件')
    expect(tamperVerdict('', '')).toContain('无固定扩展名')
  })
})

describe('file-magic / 完整流程', () => {
  it('identifyFile：正常文件给出鉴定与结论', async () => {
    const f = new File([png], 'a.png')
    const out = await identifyFile(f)
    expect(out).toContain('PNG 图片')
    expect(out).toContain('未发现篡改迹象')
  })

  it('identifyFile：改名文件判疑似篡改', async () => {
    const f = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'fake.jpg')
    const out = await identifyFile(f)
    expect(out).toContain('PDF 文档')
    expect(out).toContain('疑似篡改')
  })

  it('identifyFile：未知类型不写建议扩展名', async () => {
    const f = new File([new Uint8Array([0x01, 0x02, 0x03, 0x04])], 'x.bin')
    const out = await identifyFile(f)
    expect(out).toContain('未知类型')
    expect(out).not.toContain('建议扩展名')
  })

  it('空文件中文报错', async () => {
    await expect(identifyFile(new File([], 'e.bin'))).rejects.toThrow(/为空/)
  })

  it('超大文件直接报错', async () => {
    const big = {
      name: 'b.bin',
      size: MAX_FILE_BYTES + 1,
      slice: () => new Blob(),
    } as unknown as File
    await expect(identifyFile(big)).rejects.toThrow(/超过/)
  })

  it('只读文件头 64 字节', async () => {
    let sliced = 0
    const f = {
      name: 'a.png',
      size: 1000,
      slice: (start: number, end: number) => {
        sliced = end - start
        return new Blob([png])
      },
    } as unknown as File
    await identifyFile(f)
    expect(sliced).toBe(HEADER_BYTES)
  })

  it('transform 空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
    expect(transform({ text: 'hi' }, {})).toContain('文件头魔数')
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
    expect(calls).toEqual(['create', 'click:blob:u:file-magic.txt', 'revoke'])
  })
})
