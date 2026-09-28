import { describe, expect, it } from 'vitest'
import {
  MAX_FRAMES,
  MAX_FILE_SIZE,
  MAX_GIF_DIMENSION,
  assertFileSizeOk,
  assertFrameCountOk,
  assertFrameDimsOk,
  assertLogicalScreenOk,
  buildFrameFileName,
  delayToMs,
  errorMessage,
  getLogicalScreenSize,
  isGifFile,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
    expect(() => assertFileSizeOk(0)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('isGifFile', () => {
  it('MIME 为 image/gif 即认定', () => {
    expect(isGifFile({ type: 'image/gif', name: 'a.bin' })).toBe(true)
  })

  it('无 MIME 时按 .gif 扩展名兜底', () => {
    expect(isGifFile({ type: '', name: 'anim.GIF' })).toBe(true)
  })

  it('非 GIF 返回 false', () => {
    expect(isGifFile({ type: 'image/png', name: 'a.png' })).toBe(false)
    expect(isGifFile({ type: '', name: 'a.png' })).toBe(false)
  })
})

describe('getLogicalScreenSize', () => {
  it('取出 lsd 宽高', () => {
    expect(getLogicalScreenSize({ lsd: { width: 320, height: 240 } })).toEqual({
      width: 320,
      height: 240,
    })
  })
})

describe('assertLogicalScreenOk', () => {
  it('合法尺寸不抛错（含上限边界）', () => {
    expect(() => assertLogicalScreenOk(100, 80)).not.toThrow()
    expect(() => assertLogicalScreenOk(MAX_GIF_DIMENSION, MAX_GIF_DIMENSION)).not.toThrow()
  })

  it('非正数/非有限值抛错', () => {
    expect(() => assertLogicalScreenOk(0, 100)).toThrow(/GIF 尺寸无效/)
    expect(() => assertLogicalScreenOk(100, -1)).toThrow(/GIF 尺寸无效/)
    expect(() => assertLogicalScreenOk(NaN, 100)).toThrow(/GIF 尺寸无效/)
    expect(() => assertLogicalScreenOk(100, Infinity)).toThrow(/GIF 尺寸无效/)
  })

  it('宽或高超限抛错', () => {
    expect(() => assertLogicalScreenOk(MAX_GIF_DIMENSION + 1, 100)).toThrow(/GIF 尺寸过大/)
    expect(() => assertLogicalScreenOk(100, MAX_GIF_DIMENSION + 1)).toThrow(/GIF 尺寸过大/)
  })
})

describe('assertFrameCountOk', () => {
  it('上限内不抛错', () => {
    expect(() => assertFrameCountOk(0)).not.toThrow()
    expect(() => assertFrameCountOk(MAX_FRAMES)).not.toThrow()
  })

  it('超限抛错“帧数过多”', () => {
    expect(() => assertFrameCountOk(MAX_FRAMES + 1)).toThrow(/帧数过多/)
  })
})

describe('assertFrameDimsOk', () => {
  it('合法不抛错', () => {
    expect(() => assertFrameDimsOk(100, 80)).not.toThrow()
  })

  it('0 尺寸/非法值抛错', () => {
    expect(() => assertFrameDimsOk(0, 80)).toThrow(/GIF 帧尺寸无效/)
    expect(() => assertFrameDimsOk(100, 0)).toThrow(/GIF 帧尺寸无效/)
    expect(() => assertFrameDimsOk(NaN, 80)).toThrow(/GIF 帧尺寸无效/)
  })
})

describe('delayToMs', () => {
  it('delay 单位 1/100 秒换算为毫秒（×10）', () => {
    expect(delayToMs(10)).toBe(100)
    expect(delayToMs(0)).toBe(0)
    expect(delayToMs(7)).toBe(70)
  })
})

describe('buildFrameFileName', () => {
  it('按总帧数位数补零，如 photo-frame-01.png', () => {
    expect(buildFrameFileName('photo.gif', 1, 12)).toBe('photo-frame-01.png')
    expect(buildFrameFileName('photo.gif', 12, 12)).toBe('photo-frame-12.png')
  })

  it('总帧数超 2 位数时按实际位数补零', () => {
    expect(buildFrameFileName('a.gif', 7, 1234)).toBe('a-frame-0007.png')
  })

  it('无扩展名/空名兜底', () => {
    expect(buildFrameFileName('noext', 3, 9)).toBe('noext-frame-03.png')
    expect(buildFrameFileName('', 1, 2)).toBe('image-frame-01.png')
    expect(buildFrameFileName('.gif', 1, 2)).toBe('image-frame-01.png')
  })
})
