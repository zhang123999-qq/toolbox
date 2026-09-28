import { describe, expect, it, vi } from 'vitest'
import {
  buildOutputFileName,
  getSupportError,
  mapCameraError,
  mirrorStyle,
  stopAllTracks,
} from './utils'

describe('getSupportError', () => {
  it('具备 API 返回 null，缺失返回 unsupported', () => {
    expect(getSupportError(true)).toBeNull()
    expect(getSupportError(false)).toBe('unsupported')
  })
})

describe('mapCameraError', () => {
  it('NotAllowedError → denied（拒绝授权）', () => {
    expect(mapCameraError(new DOMException('Permission denied', 'NotAllowedError'))).toBe('denied')
  })

  it('NotFoundError → notfound（无摄像头，普通 Error 携带 name 也识别）', () => {
    const err = new Error('no device')
    err.name = 'NotFoundError'
    expect(mapCameraError(err)).toBe('notfound')
  })

  it('OverconstrainedError → overconstrained（不支持后置）', () => {
    expect(mapCameraError(new DOMException('constraint', 'OverconstrainedError'))).toBe(
      'overconstrained',
    )
  })

  it('未知错误 → failed', () => {
    expect(mapCameraError(new Error('boom'))).toBe('failed')
    expect(mapCameraError(new DOMException('aborted', 'AbortError'))).toBe('failed')
  })

  it('非 Error 输入 → failed', () => {
    expect(mapCameraError('字符串错误')).toBe('failed')
    expect(mapCameraError(null)).toBe('failed')
    expect(mapCameraError(undefined)).toBe('failed')
  })
})

describe('stopAllTracks', () => {
  it('null 流直接返回不抛错', () => {
    expect(() => stopAllTracks(null)).not.toThrow()
  })

  it('停止流的全部 track', () => {
    const t1 = { stop: vi.fn() }
    const t2 = { stop: vi.fn() }
    const stream = { getTracks: () => [t1, t2] } as unknown as MediaStream
    stopAllTracks(stream)
    expect(t1.stop).toHaveBeenCalledTimes(1)
    expect(t2.stop).toHaveBeenCalledTimes(1)
  })
})

describe('buildOutputFileName', () => {
  it('时间戳注入生成固定文件名', () => {
    // 注意月份 0 起：8 = 9 月
    expect(buildOutputFileName(new Date(2026, 8, 28, 14, 9, 5))).toBe(
      'snapshot-20260928-140905.png',
    )
  })

  it('个位数补零', () => {
    expect(buildOutputFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe('snapshot-20260102-030405.png')
  })
})

describe('mirrorStyle', () => {
  it('开启返回水平翻转，关闭返回空字符串', () => {
    expect(mirrorStyle(true)).toBe('scaleX(-1)')
    expect(mirrorStyle(false)).toBe('')
  })
})
