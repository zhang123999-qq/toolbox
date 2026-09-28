import { describe, expect, it } from 'vitest'
import { HEADER_BYTES, detectVideoFormat, formatBytes, formatReport } from './utils'

/** 把 ASCII 字符串 / 字节数组拼进字节数组 */
function bytes(...parts: Array<string | number[] | Uint8Array>): Uint8Array {
  const out: number[] = []
  for (const p of parts) {
    if (typeof p === 'string') for (const ch of p) out.push(ch.charCodeAt(0))
    else out.push(...p)
  }
  return new Uint8Array(out)
}

/** EBML 头 + DocType 元素 */
function ebmlHead(docType: string | null, sizeByte?: number): Uint8Array {
  const head = bytes([0x1a, 0x45, 0xdf, 0xa3])
  if (docType === null) return head
  const sb = sizeByte ?? 0x80 | docType.length
  return bytes(head, [0x42, 0x82, sb], docType)
}

describe('video-format / 魔数识别', () => {
  it('HEADER_BYTES 为 64', () => {
    expect(HEADER_BYTES).toBe(64)
  })

  it('空文件抛中文错', () => {
    expect(() => detectVideoFormat(new Uint8Array(0))).toThrow(/文件为空/)
  })

  it('MP4：ftyp 主品牌 isom', () => {
    const g = detectVideoFormat(bytes([0, 0, 0, 32], 'ftyp', 'isom', [0, 0, 0, 0]))
    expect(g.known).toBe(true)
    expect(g.kind).toBe('mp4')
    expect(g.label).toBe('MP4 视频')
  })

  it('MOV：ftyp 主品牌 qt（QuickTime）', () => {
    const g = detectVideoFormat(bytes([0, 0, 0, 32], 'ftyp', 'qt  ', [0, 0, 0, 0]))
    expect(g.kind).toBe('mov')
    expect(g.label).toBe('MOV 视频')
    expect(g.detail).toContain('QuickTime')
  })

  it('3GP：ftyp 主品牌 3gp5', () => {
    const g = detectVideoFormat(bytes([0, 0, 0, 32], 'ftyp', '3gp5', [0, 0, 0, 0]))
    expect(g.kind).toBe('mp4')
    expect(g.label).toBe('3GP 视频')
  })

  it('ftyp 非常见品牌 → MP4 系视频', () => {
    const g = detectVideoFormat(bytes([0, 0, 0, 32], 'ftyp', 'abcd', [0, 0, 0, 0]))
    expect(g.known).toBe(true)
    expect(g.label).toBe('MP4 系视频')
    expect(g.detail).toContain('abcd')
  })

  it('ftyp 品牌不可读 → 占位显示', () => {
    const g = detectVideoFormat(bytes([0, 0, 0, 32], 'ftyp', [0, 0, 0, 0]))
    expect(g.detail).toContain('不可读')
  })

  it('ftyp 不足 12 字节 → 未知', () => {
    const g = detectVideoFormat(bytes([0, 0, 0, 32], 'ftyp'))
    expect(g.known).toBe(false)
    expect(g.detail).toContain('ftyp')
  })

  it('WebM：EBML + DocType=webm', () => {
    const g = detectVideoFormat(ebmlHead('webm'))
    expect(g.kind).toBe('webm')
    expect(g.label).toBe('WebM 视频')
  })

  it('MKV：EBML + DocType=matroska', () => {
    const g = detectVideoFormat(ebmlHead('matroska'))
    expect(g.kind).toBe('mkv')
    expect(g.label).toBe('MKV 视频')
  })

  it('EBML 但无 DocType → MKV/WebM 系', () => {
    const g = detectVideoFormat(ebmlHead(null))
    expect(g.known).toBe(true)
    expect(g.label).toBe('MKV/WebM 系视频')
    expect(g.detail).toContain('未找到 DocType')
  })

  it('EBML 非常见 DocType → MKV/WebM 系', () => {
    const g = detectVideoFormat(ebmlHead('ebml-custom'))
    expect(g.label).toBe('MKV/WebM 系视频')
    expect(g.detail).toContain('ebml-custom')
  })

  it('EBML DocType 长度字节非法 → 视为未找到', () => {
    // 1 字节 vint 首位不是 1
    expect(detectVideoFormat(ebmlHead('webm', 0x04)).detail).toContain('未找到 DocType')
    // 长度为 0
    expect(detectVideoFormat(ebmlHead('webm', 0x80)).detail).toContain('未找到 DocType')
    // 长度 > 16
    expect(detectVideoFormat(ebmlHead('webm', 0x91)).detail).toContain('未找到 DocType')
    // 声明长度超出实际头长度
    const truncated = bytes([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x85], 'we')
    expect(detectVideoFormat(truncated).detail).toContain('未找到 DocType')
  })

  it('AVI：RIFF....AVI ', () => {
    const g = detectVideoFormat(bytes('RIFF', [1, 2, 3, 4], 'AVI '))
    expect(g.kind).toBe('avi')
    expect(g.label).toBe('AVI 视频')
  })

  it('RIFF 但非 AVI / 头不足 → 未知', () => {
    expect(detectVideoFormat(bytes('RIFF', [1, 2, 3, 4], 'WAVE')).known).toBe(false)
    expect(detectVideoFormat(bytes('RIFF', [1, 2])).known).toBe(false)
  })

  it('FLV：FLV + 版本 0x01', () => {
    const g = detectVideoFormat(bytes('FLV', [0x01, 0x05, 0, 0]))
    expect(g.kind).toBe('flv')
    expect(g.label).toBe('FLV 视频')
  })

  it('FLV 版本不对 / 头不足 → 未知', () => {
    expect(detectVideoFormat(bytes('FLV', [0x02, 0, 0])).known).toBe(false)
    expect(detectVideoFormat(bytes('FLV')).known).toBe(false)
  })

  it('WMV：ASF GUID', () => {
    const g = detectVideoFormat(
      bytes([
        0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce,
        0x6c,
      ]),
    )
    expect(g.kind).toBe('wmv')
    expect(g.label).toBe('WMV 视频')
  })

  it('TS：0x47 同步字节；188 字节对齐确认提高置信度', () => {
    const short = detectVideoFormat(bytes([0x47]))
    expect(short.kind).toBe('ts')
    expect(short.detail).toContain('未做包对齐确认')
    const full = new Uint8Array(189)
    full[0] = 0x47
    full[188] = 0x47
    const confident = detectVideoFormat(full)
    expect(confident.kind).toBe('ts')
    expect(confident.detail).toContain('包对齐已确认')
  })

  it('Ogg 视频：OggS', () => {
    const g = detectVideoFormat(bytes('OggS', [0, 2, 0, 0]))
    expect(g.kind).toBe('ogv')
    expect(g.label).toBe('Ogg 视频')
  })

  it('未知格式 → 中文说明', () => {
    const g = detectVideoFormat(bytes('ZZZZ', [1, 2, 3, 4]))
    expect(g.known).toBe(false)
    expect(g.kind).toBe('unknown')
    expect(g.label).toBe('未知格式')
    expect(g.detail).toContain('MP4/MOV')
  })
})

describe('video-format / 杂项', () => {
  it('formatBytes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })

  it('formatReport：有 / 无依据都拼接', () => {
    const guess = detectVideoFormat(bytes([0, 0, 0, 32], 'ftyp', 'isom', [0, 0, 0, 0]))
    const report = formatReport('a.mp4', 2048, guess)
    expect(report).toContain('文件：a.mp4')
    expect(report).toContain('识别结果：MP4 视频')
    expect(report).toContain('依据：')
    const noDetail = formatReport('x.bin', 10, {
      known: true,
      kind: 'mp4',
      label: 'MP4 视频',
      detail: '',
    })
    expect(noDetail).not.toContain('依据：')
  })
})
