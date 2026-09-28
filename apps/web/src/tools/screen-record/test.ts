import { describe, expect, it } from 'vitest'
import {
  MIME_CANDIDATES,
  buildOutputFileName,
  formatDuration,
  mapRecordError,
  pickMimeType,
} from './utils'

describe('pickMimeType', () => {
  const none = () => false
  const all = () => true

  it('auto 偏好按候选顺序返回第一个受支持的', () => {
    expect(pickMimeType(all, MIME_CANDIDATES, 'auto')).toBe('video/webm;codecs=vp9')
    const onlyWebm = (m: string) => m === 'video/webm'
    expect(pickMimeType(onlyWebm, MIME_CANDIDATES, 'auto')).toBe('video/webm')
  })

  it('无可用时返回 null', () => {
    expect(pickMimeType(none, MIME_CANDIDATES, 'auto')).toBeNull()
    expect(pickMimeType(none, MIME_CANDIDATES, 'vp9')).toBeNull()
    expect(pickMimeType(all, [], 'auto')).toBeNull()
  })

  it('偏好 vp9 时优先探测 vp9 候选项', () => {
    const seen: string[] = []
    const probe = (m: string) => {
      seen.push(m)
      return m === 'video/webm;codecs=vp8'
    }
    expect(pickMimeType(probe, MIME_CANDIDATES, 'vp9')).toBe('video/webm;codecs=vp8')
    // vp9 候选项先被探测（即使不支持），随后兜底命中 vp8
    expect(seen[0]).toBe('video/webm;codecs=vp9')
    expect(seen).toContain('video/webm;codecs=vp8')
  })

  it('偏好命中时直接返回偏好编码', () => {
    const onlyVp8 = (m: string) => m === 'video/webm;codecs=vp8'
    expect(pickMimeType(onlyVp8, MIME_CANDIDATES, 'vp8')).toBe('video/webm;codecs=vp8')
  })

  it('偏好编码不受支持时回退到其他候选项', () => {
    const noVp9 = (m: string) => m !== 'video/webm;codecs=vp9'
    expect(pickMimeType(noVp9, MIME_CANDIDATES, 'vp9')).toBe('video/webm;codecs=vp8')
  })
})

describe('formatDuration', () => {
  it('0 与秒级', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(999)).toBe('00:00')
    expect(formatDuration(1000)).toBe('00:01')
    expect(formatDuration(59000)).toBe('00:59')
  })

  it('分钟进位', () => {
    expect(formatDuration(60000)).toBe('01:00')
    expect(formatDuration(61000)).toBe('01:01')
    expect(formatDuration(3599999)).toBe('59:59')
  })

  it('超过 59 分钟继续累加', () => {
    expect(formatDuration(3600000)).toBe('60:00')
    expect(formatDuration(6000000)).toBe('100:00')
  })

  it('负数按 0 处理', () => {
    expect(formatDuration(-1)).toBe('00:00')
    expect(formatDuration(-60000)).toBe('00:00')
  })
})

describe('mapRecordError', () => {
  it('NotAllowedError → 拒绝权限的友好提示', () => {
    const err = new DOMException('Permission denied', 'NotAllowedError')
    expect(mapRecordError(err)).toContain('拒绝')
  })

  it('各命名错误分别映射', () => {
    expect(mapRecordError(new DOMException('', 'NotFoundError'))).toContain('未找到')
    expect(mapRecordError(new DOMException('', 'NotReadableError'))).toContain('被占用')
    expect(mapRecordError(new DOMException('', 'OverconstrainedError'))).toContain('不支持')
    expect(mapRecordError(new DOMException('', 'SecurityError'))).toContain('安全上下文')
    expect(mapRecordError(new DOMException('', 'AbortError'))).toContain('中断')
  })

  it('普通 Error 透传 message', () => {
    expect(mapRecordError(new Error('boom'))).toBe('boom')
    // 非 DOMException 的命名 Error 同样按 name 映射
    const named = new Error('x')
    named.name = 'NotAllowedError'
    expect(mapRecordError(named)).toContain('拒绝')
  })

  it('非 Error 值走 String(err)', () => {
    expect(mapRecordError('oops')).toBe('oops')
    expect(mapRecordError(42)).toBe('42')
  })
})

describe('buildOutputFileName', () => {
  it('按时间戳构造文件名', () => {
    expect(buildOutputFileName(new Date(2026, 8, 28, 14, 9, 50))).toBe(
      'screen-record-20260928-140950.webm',
    )
  })

  it('个位数补零', () => {
    expect(buildOutputFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe(
      'screen-record-20260102-030405.webm',
    )
  })
})
