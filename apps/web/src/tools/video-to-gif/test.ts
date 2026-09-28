import { describe, expect, it } from 'vitest'
import {
  MAX_DURATION_SEC,
  MAX_FPS,
  MAX_WIDTH,
  MIN_DURATION_SEC,
  MIN_FPS,
  MIN_WIDTH,
  buildGifArgs,
  formatBytes,
  formatSeconds,
  gifFileName,
  gifMimeType,
  validateGifOptions,
} from './utils'

const VALID = { startSec: 1, durationSec: 3, fps: 10, width: 480 }

describe('video-to-gif / 参数校验', () => {
  it('合法参数通过', () => {
    expect(() => validateGifOptions(VALID)).not.toThrow()
    expect(() =>
      validateGifOptions({
        startSec: 0,
        durationSec: MIN_DURATION_SEC,
        fps: MIN_FPS,
        width: MIN_WIDTH,
      }),
    ).not.toThrow()
    expect(() =>
      validateGifOptions({
        startSec: 100,
        durationSec: MAX_DURATION_SEC,
        fps: MAX_FPS,
        width: MAX_WIDTH,
      }),
    ).not.toThrow()
  })

  it('起始时间非法抛中文错：负数 / 非数字', () => {
    expect(() => validateGifOptions({ ...VALID, startSec: -1 })).toThrow(/起始时间非法/)
    expect(() => validateGifOptions({ ...VALID, startSec: Number.NaN })).toThrow(/起始时间非法/)
  })

  it('片段时长非法抛中文错：过小 / 过大 / 非数字', () => {
    expect(() => validateGifOptions({ ...VALID, durationSec: 0.05 })).toThrow(/片段时长非法/)
    expect(() => validateGifOptions({ ...VALID, durationSec: 31 })).toThrow(/片段时长非法/)
    expect(() => validateGifOptions({ ...VALID, durationSec: Number.NaN })).toThrow(/片段时长非法/)
  })

  it('帧率非法抛中文错：非整数 / 越界', () => {
    for (const bad of [0, 31, 10.5, Number.NaN]) {
      expect(() => validateGifOptions({ ...VALID, fps: bad })).toThrow(/帧率非法/)
    }
  })

  it('输出宽度非法抛中文错：非整数 / 越界', () => {
    for (const bad of [63, 1281, 100.5, Number.NaN]) {
      expect(() => validateGifOptions({ ...VALID, width: bad })).toThrow(/输出宽度非法/)
    }
  })
})

describe('video-to-gif / ffmpeg 参数组装', () => {
  it('组装出正确的切分 + 滤镜参数', () => {
    const args = buildGifArgs('input-1', 'output-1.gif', VALID)
    expect(args).toEqual([
      '-ss',
      '1',
      '-t',
      '3',
      '-i',
      'input-1',
      '-vf',
      'fps=10,scale=480:-1:flags=lanczos',
      '-f',
      'gif',
      'output-1.gif',
    ])
  })

  it('参数非法时组装抛错，不生成 ffmpeg 命令', () => {
    expect(() => buildGifArgs('in', 'out.gif', { ...VALID, fps: 99 })).toThrow(/帧率非法/)
  })
})

describe('video-to-gif / 文件名与 MIME', () => {
  it('替换扩展名为 .gif', () => {
    expect(gifFileName('movie.mp4')).toBe('movie.gif')
    expect(gifFileName('a.b.webm')).toBe('a.b.gif')
    expect(gifFileName('noext')).toBe('noext.gif')
    expect(gifFileName('.mp4')).toBe('video.gif')
  })

  it('MIME 为 image/gif', () => {
    expect(gifMimeType()).toBe('image/gif')
  })

  it('formatSeconds / formatBytes 格式化', () => {
    expect(formatSeconds(1.234)).toBe('1.23 秒')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})
