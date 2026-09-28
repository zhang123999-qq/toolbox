import { describe, expect, it } from 'vitest'
import { HEADER_BYTES, detectAudioFormat, formatBytes, formatReport } from './utils'

/** 把 ASCII 字符串拼进字节数组 */
function bytes(...parts: Array<string | number[]>): Uint8Array {
  const out: number[] = []
  for (const p of parts) {
    if (typeof p === 'string') for (const ch of p) out.push(ch.charCodeAt(0))
    else out.push(...p)
  }
  return new Uint8Array(out)
}

describe('audio-format / 魔数识别', () => {
  it('HEADER_BYTES 为 64', () => {
    expect(HEADER_BYTES).toBe(64)
  })

  it('空文件抛中文错', () => {
    expect(() => detectAudioFormat(new Uint8Array(0))).toThrow(/文件为空/)
  })

  it('WAV：RIFF....WAVE', () => {
    const g = detectAudioFormat(bytes('RIFF', [1, 2, 3, 4], 'WAVE'))
    expect(g.known).toBe(true)
    expect(g.kind).toBe('wav')
    expect(g.label).toBe('WAV 音频')
  })

  it('RIFF 但非 WAVE / 头不足 12 字节 → 未知', () => {
    const g = detectAudioFormat(bytes('RIFF', [1, 2, 3, 4], 'AVI '))
    expect(g.known).toBe(false)
    expect(g.detail).toContain('RIFF')
    const short = detectAudioFormat(bytes('RIFF', [1, 2]))
    expect(short.known).toBe(false)
    expect(short.detail).toContain('12 字节')
  })

  it('MP3：ID3v2 标签头', () => {
    const g = detectAudioFormat(bytes('ID3', [4, 0, 0, 0, 0, 0, 0]))
    expect(g.kind).toBe('mp3')
    expect(g.label).toBe('MP3 音频')
    expect(g.known).toBe(true)
  })

  it('ID3 头不足 10 字节 → 未知', () => {
    const g = detectAudioFormat(bytes('ID3', [4, 0]))
    expect(g.known).toBe(false)
    expect(g.detail).toContain('ID3')
  })

  it('FLAC：fLaC', () => {
    const g = detectAudioFormat(bytes('fLaC', [0, 0, 0, 34]))
    expect(g.kind).toBe('flac')
    expect(g.label).toBe('FLAC 音频')
  })

  it('Ogg：OggS', () => {
    const g = detectAudioFormat(bytes('OggS', [0, 2, 0, 0]))
    expect(g.kind).toBe('ogg')
    expect(g.label).toBe('Ogg 音频')
  })

  it('M4A：ftyp 主品牌 M4A', () => {
    const g = detectAudioFormat(bytes([0, 0, 0, 32], 'ftyp', 'M4A ', [0, 0, 0, 0]))
    expect(g.kind).toBe('m4a')
    expect(g.label).toBe('M4A 音频')
    expect(g.detail).toContain('M4A')
  })

  it('MP4 容器音频：ftyp 其他品牌', () => {
    const g = detectAudioFormat(bytes([0, 0, 0, 32], 'ftyp', 'isom', [0, 0, 0, 0]))
    expect(g.kind).toBe('m4a')
    expect(g.label).toBe('M4A/MP4 音频')
    expect(g.detail).toContain('isom')
  })

  it('ftyp 品牌不可读 → 显示占位', () => {
    const g = detectAudioFormat(bytes([0, 0, 0, 32], 'ftyp', [0, 0, 0, 0]))
    expect(g.known).toBe(true)
    expect(g.detail).toContain('不可读')
    // 全空格品牌同样视为不可读
    const spaces = detectAudioFormat(bytes([0, 0, 0, 32], 'ftyp', '    '))
    expect(spaces.detail).toContain('不可读')
  })

  it('ftyp 不足 12 字节 → 未知', () => {
    const g = detectAudioFormat(bytes([0, 0, 0, 32], 'ftyp'))
    expect(g.known).toBe(false)
    expect(g.detail).toContain('ftyp')
  })

  it('WMA：ASF GUID', () => {
    const g = detectAudioFormat(
      bytes([
        0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce,
        0x6c,
      ]),
    )
    expect(g.kind).toBe('wma')
    expect(g.label).toBe('WMA 音频')
  })

  it('ASF GUID 不完整 → 未知', () => {
    const g = detectAudioFormat(bytes([0x30, 0x26, 0xb2]))
    expect(g.known).toBe(false)
  })

  it('AIFF：FORM....AIFF', () => {
    const g = detectAudioFormat(bytes('FORM', [0, 0, 0, 1], 'AIFF'))
    expect(g.kind).toBe('aiff')
    expect(g.label).toBe('AIFF 音频')
  })

  it('FORM 但非 AIFF / 头不足 → 未知', () => {
    expect(detectAudioFormat(bytes('FORM', [0, 0, 0, 1], 'AIFF'.slice(0, 0), '8SVX')).known).toBe(
      false,
    )
    expect(detectAudioFormat(bytes('FORM', [1, 2])).known).toBe(false)
  })

  it('AAC：ADTS 帧同步', () => {
    const g = detectAudioFormat(bytes([0xff, 0xf1, 0x50, 0x80]))
    expect(g.kind).toBe('aac')
    expect(g.label).toBe('AAC 音频')
  })

  it('MP3：裸帧同步（无 ID3）', () => {
    const g = detectAudioFormat(bytes([0xff, 0xfb, 0x90, 0x00]))
    expect(g.kind).toBe('mp3')
    expect(g.detail).toContain('无 ID3')
  })

  it('保留位组合不判为 MP3 → 未知', () => {
    // 版本保留位 01
    expect(detectAudioFormat(bytes([0xff, 0xe8, 0x90])).known).toBe(false)
    // 层保留位 00（也不是 ADTS，因为同步字只 11 位）
    expect(detectAudioFormat(bytes([0xff, 0xe0, 0x90])).known).toBe(false)
    // 同步字不对
    expect(detectAudioFormat(bytes([0xfe, 0xfb, 0x90])).known).toBe(false)
    // 单字节文件
    expect(detectAudioFormat(bytes([0xff])).known).toBe(false)
  })

  it('未知格式 → 中文说明', () => {
    const g = detectAudioFormat(bytes('ZZZZ', [1, 2, 3, 4]))
    expect(g.known).toBe(false)
    expect(g.kind).toBe('unknown')
    expect(g.label).toBe('未知格式')
    expect(g.detail).toContain('WAV/MP3/FLAC')
  })
})

describe('audio-format / 杂项', () => {
  it('formatBytes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })

  it('formatReport：有 / 无依据都拼接', () => {
    const guess = detectAudioFormat(bytes('fLaC', [0]))
    const report = formatReport('a.flac', 2048, guess)
    expect(report).toContain('文件：a.flac')
    expect(report).toContain('大小：2.00 KiB')
    expect(report).toContain('识别结果：FLAC 音频')
    expect(report).toContain('依据：')
    const noDetail = formatReport('x.bin', 10, {
      known: true,
      kind: 'wav',
      label: 'WAV 音频',
      detail: '',
    })
    expect(noDetail).not.toContain('依据：')
  })
})
