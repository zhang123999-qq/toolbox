import { describe, expect, it } from 'vitest'
import {
  cameraErrorMessage,
  dataUrlMime,
  dataUrlPayload,
  fitPhotoSize,
  photoFileName,
} from './utils'

describe('camera-photo / 尺寸计算', () => {
  it('等比缩放使最长边不超过 maxSide', () => {
    expect(fitPhotoSize(1920, 1080, 1920)).toEqual({ width: 1920, height: 1080 })
    expect(fitPhotoSize(3840, 2160, 1920)).toEqual({ width: 1920, height: 1080 })
    expect(fitPhotoSize(1080, 1920, 960)).toEqual({ width: 540, height: 960 })
    expect(fitPhotoSize(640, 480, 4096)).toEqual({ width: 640, height: 480 })
    expect(fitPhotoSize(1, 1, 1)).toEqual({ width: 1, height: 1 })
    expect(fitPhotoSize(1, 100, 0.4)).toEqual({ width: 1, height: 1 })
  })

  it('非法尺寸抛中文错', () => {
    expect(() => fitPhotoSize(0, 480, 1920)).toThrow(/视频尺寸非法/)
    expect(() => fitPhotoSize(-1, 480, 1920)).toThrow(/视频尺寸非法/)
    expect(() => fitPhotoSize(640, 0, 1920)).toThrow(/视频尺寸非法/)
    expect(() => fitPhotoSize(Number.NaN, 480, 1920)).toThrow(/视频尺寸非法/)
    expect(() => fitPhotoSize(640, Number.NaN, 1920)).toThrow(/视频尺寸非法/)
    expect(() => fitPhotoSize(640, 480, 0)).toThrow(/最长边非法/)
    expect(() => fitPhotoSize(640, 480, -3)).toThrow(/最长边非法/)
    expect(() => fitPhotoSize(640, 480, Number.NaN)).toThrow(/最长边非法/)
  })
})

describe('camera-photo / DataURL 解析', () => {
  it('解析 MIME 与负载', () => {
    expect(dataUrlMime('data:image/png;base64,iVBOR')).toBe('image/png')
    expect(dataUrlMime('data:image/jpeg,iVBOR')).toBe('image/jpeg')
    expect(dataUrlPayload('data:image/png;base64,iVBOR')).toBe('iVBOR')
  })

  it('非法 dataURL 抛中文错', () => {
    expect(() => dataUrlMime('not-a-data-url')).toThrow(/不是合法的 dataURL/)
    expect(() => dataUrlMime('data:;base64,xx')).toThrow(/不是合法的 dataURL/)
    expect(() => dataUrlPayload('data:image/png;base64')).toThrow(/缺少负载分隔符/)
  })
})

describe('camera-photo / 文件名', () => {
  it('按时间戳命名', () => {
    expect(photoFileName(new Date(2026, 8, 28, 11, 19, 5))).toBe('拍照-20260928-111905.png')
  })

  it('非法日期抛中文错', () => {
    expect(() => photoFileName(new Date(Number.NaN))).toThrow(/日期非法/)
  })
})

describe('camera-photo / 错误文案', () => {
  it('权限拒绝 → 提示去地址栏开启权限', () => {
    expect(cameraErrorMessage(new DOMException('denied', 'NotAllowedError'))).toContain(
      '摄像头权限被拒绝',
    )
    expect(cameraErrorMessage(new DOMException('denied', 'SecurityError'))).toContain(
      '摄像头权限被拒绝',
    )
  })

  it('无设备 → 提示检查设备连接', () => {
    expect(cameraErrorMessage(new DOMException('none', 'NotFoundError'))).toContain(
      '未检测到可用摄像头',
    )
    expect(cameraErrorMessage(new DOMException('none', 'OverconstrainedError'))).toContain(
      '未检测到可用摄像头',
    )
  })

  it('其他错误带出原始信息，非 Error 值兜底', () => {
    expect(cameraErrorMessage(new DOMException('x', 'AbortError'))).toContain('无法打开摄像头：')
    expect(cameraErrorMessage(new Error('boom'))).toContain('无法打开摄像头：boom')
    expect(cameraErrorMessage(42)).toBe('无法打开摄像头，请重试')
  })
})
