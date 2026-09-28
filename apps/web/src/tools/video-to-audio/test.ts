import { describe, expect, it } from 'vitest'
import {
  EXTRACT_FORMATS,
  LOSSY_FORMATS,
  MAX_BITRATE_KBPS,
  MIN_BITRATE_KBPS,
  buildExtractAudioArgs,
  extractFileName,
  extractMimeType,
  formatBytes,
  isLossyFormat,
  validateBitrateKbps,
  validateExtractFormat,
} from './utils'

describe('video-to-audio / 格式与比特率校验', () => {
  it('合法格式通过白名单校验', () => {
    for (const f of EXTRACT_FORMATS) {
      expect(() => validateExtractFormat(f)).not.toThrow()
    }
  })

  it('非法格式抛中文错', () => {
    expect(() => validateExtractFormat('m4a')).toThrow(/不支持的输出格式/)
    expect(() => validateExtractFormat('')).toThrow(/不支持的输出格式/)
  })

  it('比特率边界通过', () => {
    expect(() => validateBitrateKbps(MIN_BITRATE_KBPS)).not.toThrow()
    expect(() => validateBitrateKbps(MAX_BITRATE_KBPS)).not.toThrow()
    expect(() => validateBitrateKbps(192)).not.toThrow()
  })

  it('比特率非法抛中文错：非整数 / 越界 / 非数字', () => {
    for (const bad of [31, 321, 128.5, Number.NaN]) {
      expect(() => validateBitrateKbps(bad)).toThrow(/比特率非法/)
    }
  })

  it('有损格式判断', () => {
    expect(isLossyFormat('mp3')).toBe(true)
    expect(isLossyFormat('ogg')).toBe(true)
    expect(isLossyFormat('wav')).toBe(false)
    expect(isLossyFormat('flac')).toBe(false)
    expect(LOSSY_FORMATS).toContain('mp3')
  })
})

describe('video-to-audio / ffmpeg 参数组装', () => {
  it('mp3：-vn 丢弃视频流，libmp3lame + 比特率', () => {
    const args = buildExtractAudioArgs('input-1', 'output-1.mp3', 'mp3', 192)
    expect(args).toEqual([
      '-i',
      'input-1',
      '-vn',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      'output-1.mp3',
    ])
  })

  it('ogg：libvorbis + 比特率', () => {
    const args = buildExtractAudioArgs('in', 'out.ogg', 'ogg', 128)
    expect(args).toEqual(['-i', 'in', '-vn', '-c:a', 'libvorbis', '-b:a', '128k', 'out.ogg'])
  })

  it('wav：pcm_s16le，不带比特率', () => {
    const args = buildExtractAudioArgs('in', 'out.wav', 'wav', 192)
    expect(args).toEqual(['-i', 'in', '-vn', '-c:a', 'pcm_s16le', 'out.wav'])
  })

  it('flac：flac 编码，不带比特率', () => {
    const args = buildExtractAudioArgs('in', 'out.flac', 'flac', 192)
    expect(args).toEqual(['-i', 'in', '-vn', '-c:a', 'flac', 'out.flac'])
  })

  it('比特率非法时组装抛错', () => {
    expect(() => buildExtractAudioArgs('in', 'out.mp3', 'mp3', 999)).toThrow(/比特率非法/)
  })
})

describe('video-to-audio / 文件名与 MIME', () => {
  it('替换扩展名', () => {
    expect(extractFileName('movie.mp4', 'mp3')).toBe('movie.mp3')
    expect(extractFileName('a.b.webm', 'wav')).toBe('a.b.wav')
    expect(extractFileName('noext', 'ogg')).toBe('noext.ogg')
    expect(extractFileName('.mp4', 'flac')).toBe('video.flac')
  })

  it('非法格式时文件名生成抛错', () => {
    expect(() => extractFileName('movie.mp4', 'm4a' as never)).toThrow(/不支持的输出格式/)
  })

  it('MIME 映射', () => {
    expect(extractMimeType('mp3')).toBe('audio/mpeg')
    expect(extractMimeType('wav')).toBe('audio/wav')
    expect(extractMimeType('ogg')).toBe('audio/ogg')
    expect(extractMimeType('flac')).toBe('audio/flac')
  })

  it('formatBytes 格式化', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})
