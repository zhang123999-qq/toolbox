import { describe, expect, it } from 'vitest'
import {
  buildCompressArgs,
  compressFileName,
  compressMimeType,
  formatBytes,
  qualityToCrf,
  resolutionToHeight,
  validateCompressQuality,
  validateCompressResolution,
} from './utils'

describe('video-compress / 档位校验与映射', () => {
  it('画质档位映射到 CRF', () => {
    expect(qualityToCrf('high')).toBe(23)
    expect(qualityToCrf('medium')).toBe(28)
    expect(qualityToCrf('low')).toBe(33)
  })

  it('分辨率档位映射到高度，original 返回 0', () => {
    expect(resolutionToHeight('original')).toBe(0)
    expect(resolutionToHeight('1080p')).toBe(1080)
    expect(resolutionToHeight('720p')).toBe(720)
    expect(resolutionToHeight('480p')).toBe(480)
  })

  it('合法档位通过校验', () => {
    expect(() => validateCompressQuality('high')).not.toThrow()
    expect(() => validateCompressQuality('low')).not.toThrow()
    expect(() => validateCompressResolution('original')).not.toThrow()
    expect(() => validateCompressResolution('720p')).not.toThrow()
  })

  it('非法档位抛中文错', () => {
    expect(() => validateCompressQuality('ultra')).toThrow(/画质档位非法/)
    expect(() => validateCompressQuality('')).toThrow(/画质档位非法/)
    expect(() => validateCompressResolution('4k')).toThrow(/目标分辨率非法/)
    expect(() => validateCompressResolution('')).toThrow(/目标分辨率非法/)
  })
})

describe('video-compress / ffmpeg 参数组装', () => {
  it('均衡画质 + 720p：带 scale 滤镜与 CRF 28', () => {
    const args = buildCompressArgs('input-1', 'output-1.mp4', 'medium', '720p')
    expect(args).toEqual([
      '-i',
      'input-1',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '28',
      '-vf',
      'scale=-2:720',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      'output-1.mp4',
    ])
  })

  it('保持原分辨率时不带 scale 滤镜', () => {
    const args = buildCompressArgs('in', 'out.mp4', 'high', 'original')
    expect(args).not.toContain('-vf')
    expect(args).toContain('23')
  })

  it('极限压缩用 CRF 33', () => {
    const args = buildCompressArgs('in', 'out.mp4', 'low', '480p')
    expect(args).toContain('33')
    expect(args).toContain('scale=-2:480')
  })
})

describe('video-compress / 文件名与 MIME', () => {
  it('输出文件名加 -compressed.mp4 后缀', () => {
    expect(compressFileName('movie.mp4')).toBe('movie-compressed.mp4')
    expect(compressFileName('a.b.webm')).toBe('a.b-compressed.mp4')
    expect(compressFileName('noext')).toBe('noext-compressed.mp4')
    expect(compressFileName('.mp4')).toBe('video-compressed.mp4')
  })

  it('MIME 为 video/mp4', () => {
    expect(compressMimeType()).toBe('video/mp4')
  })

  it('formatBytes 格式化', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})
