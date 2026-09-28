import { describe, expect, it } from 'vitest'
import {
  CANDIDATE_MIMES,
  captureErrorMessage,
  extForMime,
  formatBytes,
  formatElapsed,
  pickMimeType,
  recorderFileName,
} from './utils'

describe('screen-recorder / MIME 选择', () => {
  it('挑第一个被支持的 MIME', () => {
    expect(pickMimeType(CANDIDATE_MIMES, () => false)).toBe('')
    expect(pickMimeType(CANDIDATE_MIMES, (m) => m === 'video/webm')).toBe('video/webm')
    expect(pickMimeType(CANDIDATE_MIMES, () => true)).toBe('video/webm;codecs=vp9,opus')
    expect(pickMimeType([], () => true)).toBe('')
  })

  it('MIME 推导扩展名', () => {
    expect(extForMime('video/webm;codecs=vp9,opus')).toBe('webm')
    expect(extForMime('video/mp4')).toBe('mp4')
    expect(extForMime('')).toBe('webm')
  })
})

describe('screen-recorder / 时长格式化', () => {
  it('毫秒转 mm:ss / h:mm:ss', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(59000)).toBe('00:59')
    expect(formatElapsed(61000)).toBe('01:01')
    expect(formatElapsed(3599999)).toBe('59:59')
    expect(formatElapsed(3600000)).toBe('1:00:00')
    expect(formatElapsed(3661000)).toBe('1:01:01')
    expect(formatElapsed(1500)).toBe('00:01')
  })

  it('非法时长抛中文错', () => {
    expect(() => formatElapsed(-1)).toThrow(/时长非法/)
    expect(() => formatElapsed(Number.NaN)).toThrow(/时长非法/)
  })

  it('formatBytes 各量级', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.50 MiB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
  })
})

describe('screen-recorder / 文件名', () => {
  it('按时间戳命名', () => {
    const name = recorderFileName('webm', new Date(2026, 8, 28, 11, 19, 5))
    expect(name).toBe('屏幕录制-20260928-111905.webm')
  })

  it('mp4 扩展名与非法扩展名兜底', () => {
    const mp4 = recorderFileName('mp4', new Date(2026, 0, 2, 3, 4, 5))
    expect(mp4).toBe('屏幕录制-20260102-030405.mp4')
    const weird = recorderFileName('../../etc', new Date(2026, 0, 2, 3, 4, 5))
    expect(weird).toBe('屏幕录制-20260102-030405.webm')
  })

  it('非法日期抛中文错', () => {
    expect(() => recorderFileName('webm', new Date(Number.NaN))).toThrow(/日期非法/)
  })
})

describe('screen-recorder / 错误文案', () => {
  it('用户取消 → 已取消提示', () => {
    expect(captureErrorMessage(new DOMException('denied', 'NotAllowedError'))).toContain(
      '已取消屏幕共享',
    )
  })

  it('其他错误带出原始信息', () => {
    expect(captureErrorMessage(new DOMException('boom', 'AbortError'))).toContain(
      '无法开始录制：boom',
    )
    expect(captureErrorMessage(new Error('oops'))).toContain('无法开始录制：oops')
  })

  it('非 Error 值兜底', () => {
    expect(captureErrorMessage('nope')).toBe('无法开始录制，请重试')
    expect(captureErrorMessage(undefined)).toBe('无法开始录制，请重试')
  })
})
