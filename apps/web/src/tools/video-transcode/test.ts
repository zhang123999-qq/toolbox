import { describe, expect, it } from 'vitest'
import {
  buildTranscodeArgs,
  codecsForFormat,
  formatBytes,
  resolutionToHeight,
  transcodeFileName,
  transcodeMimeType,
  validateTranscodeFormat,
  validateTranscodeResolution,
} from './utils'

describe('video-transcode / 容器与分辨率校验', () => {
  it('容器 → 编码器映射', () => {
    expect(codecsForFormat('mp4')).toEqual({ vcodec: 'libx264', acodec: 'aac' })
    expect(codecsForFormat('mov')).toEqual({ vcodec: 'libx264', acodec: 'aac' })
    expect(codecsForFormat('mkv')).toEqual({ vcodec: 'libx264', acodec: 'aac' })
    expect(codecsForFormat('webm')).toEqual({ vcodec: 'libvpx-vp9', acodec: 'libopus' })
  })

  it('分辨率档位映射到高度，original 返回 0', () => {
    expect(resolutionToHeight('original')).toBe(0)
    expect(resolutionToHeight('1080p')).toBe(1080)
    expect(resolutionToHeight('720p')).toBe(720)
    expect(resolutionToHeight('480p')).toBe(480)
  })

  it('合法档位通过校验', () => {
    expect(() => validateTranscodeFormat('mp4')).not.toThrow()
    expect(() => validateTranscodeFormat('webm')).not.toThrow()
    expect(() => validateTranscodeResolution('original')).not.toThrow()
    expect(() => validateTranscodeResolution('480p')).not.toThrow()
  })

  it('非法档位抛中文错', () => {
    expect(() => validateTranscodeFormat('avi')).toThrow(/目标容器非法/)
    expect(() => validateTranscodeFormat('')).toThrow(/目标容器非法/)
    expect(() => validateTranscodeResolution('4k')).toThrow(/目标分辨率非法/)
    expect(() => validateTranscodeResolution('')).toThrow(/目标分辨率非法/)
  })
})

describe('video-transcode / ffmpeg 参数组装', () => {
  it('mp4 + 保持原分辨率：H.264 + AAC，不带 scale', () => {
    const args = buildTranscodeArgs('input-1', 'output-1.mp4', 'mp4', 'original')
    expect(args).toEqual(['-i', 'input-1', '-c:v', 'libx264', '-c:a', 'aac', 'output-1.mp4'])
  })

  it('webm + 720p：VP9 + Opus，带 scale 滤镜', () => {
    const args = buildTranscodeArgs('in', 'out.webm', 'webm', '720p')
    expect(args).toEqual([
      '-i',
      'in',
      '-c:v',
      'libvpx-vp9',
      '-c:a',
      'libopus',
      '-vf',
      'scale=-2:720',
      'out.webm',
    ])
  })

  it('mov + 480p', () => {
    const args = buildTranscodeArgs('in', 'out.mov', 'mov', '480p')
    expect(args).toContain('scale=-2:480')
    expect(args).toContain('libx264')
  })
})

describe('video-transcode / 文件名与 MIME', () => {
  it('扩展名替换为目标容器', () => {
    expect(transcodeFileName('movie.mp4', 'webm')).toBe('movie.webm')
    expect(transcodeFileName('a.b.mkv', 'mov')).toBe('a.b.mov')
    expect(transcodeFileName('noext', 'mp4')).toBe('noext.mp4')
    expect(transcodeFileName('.mp4', 'mkv')).toBe('video.mkv')
  })

  it('非法容器时文件名生成抛错', () => {
    expect(() => transcodeFileName('movie.mp4', 'avi' as never)).toThrow(/目标容器非法/)
  })

  it('MIME 映射', () => {
    expect(transcodeMimeType('mp4')).toBe('video/mp4')
    expect(transcodeMimeType('webm')).toBe('video/webm')
    expect(transcodeMimeType('mov')).toBe('video/quicktime')
    expect(transcodeMimeType('mkv')).toBe('video/x-matroska')
  })

  it('formatBytes 格式化', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})
