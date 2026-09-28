import { describe, expect, it } from 'vitest'
import { buildOutputFileName, getSupportError, mapCaptureError } from './utils'

describe('getSupportError', () => {
  it('有 getDisplayMedia 时返回 null', () => {
    expect(getSupportError(true)).toBeNull()
  })

  it('无 getDisplayMedia 时返回 unsupported', () => {
    expect(getSupportError(false)).toBe('unsupported')
  })
})

describe('mapCaptureError', () => {
  it('NotAllowedError → denied（用户拒绝/取消授权）', () => {
    expect(mapCaptureError(new DOMException('denied', 'NotAllowedError'))).toBe('denied')
  })

  it('NotFoundError → notfound', () => {
    expect(mapCaptureError(new DOMException('no screen', 'NotFoundError'))).toBe('notfound')
  })

  it('OverconstrainedError → notfound', () => {
    expect(mapCaptureError(new DOMException('over', 'OverconstrainedError'))).toBe('notfound')
  })

  it('其他 DOMException → failed', () => {
    expect(mapCaptureError(new DOMException('abort', 'AbortError'))).toBe('failed')
  })

  it('普通 Error → failed', () => {
    expect(mapCaptureError(new Error('boom'))).toBe('failed')
  })

  it('非 Error 值 → failed', () => {
    expect(mapCaptureError('字符串错误')).toBe('failed')
    expect(mapCaptureError(undefined)).toBe('failed')
  })
})

describe('buildOutputFileName', () => {
  it('按时间戳构造文件名', () => {
    expect(buildOutputFileName(1727000000000)).toBe('screen-capture-1727000000000.png')
    expect(buildOutputFileName(0)).toBe('screen-capture-0.png')
  })
})
