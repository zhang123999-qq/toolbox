import { describe, expect, it } from 'vitest'
import {
  KEYBOARD_STEP,
  MAX_FILE_SIZE,
  aspectStyle,
  assertFileSizeOk,
  clampPercent,
  clipPathFor,
  errorMessage,
  handlePosition,
  percentFromClientRect,
  percentFromPointer,
  stepPercent,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
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

describe('clampPercent', () => {
  it('范围内原样返回', () => {
    expect(clampPercent(0)).toBe(0)
    expect(clampPercent(50)).toBe(50)
    expect(clampPercent(100)).toBe(100)
  })

  it('越界钳制到 0–100', () => {
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(120)).toBe(100)
  })

  it('NaN/Infinity 抛错', () => {
    expect(() => clampPercent(NaN)).toThrow('滑块位置无效')
    expect(() => clampPercent(Infinity)).toThrow('滑块位置无效')
    expect(() => clampPercent(-Infinity)).toThrow('滑块位置无效')
  })
})

describe('clipPathFor', () => {
  it('horizontal：上层图显示左侧 p%，从右侧裁掉剩余', () => {
    expect(clipPathFor(50, 'horizontal')).toBe('inset(0 50% 0 0)')
    expect(clipPathFor(0, 'horizontal')).toBe('inset(0 100% 0 0)')
    expect(clipPathFor(100, 'horizontal')).toBe('inset(0 0% 0 0)')
  })

  it('vertical：上层图显示上方 p%，从下方裁掉剩余', () => {
    expect(clipPathFor(50, 'vertical')).toBe('inset(0 0 50% 0)')
    expect(clipPathFor(25, 'vertical')).toBe('inset(0 0 75% 0)')
    expect(clipPathFor(100, 'vertical')).toBe('inset(0 0 0% 0)')
  })

  it('先 clamp 再生成', () => {
    expect(clipPathFor(150, 'horizontal')).toBe('inset(0 0% 0 0)')
    expect(clipPathFor(-20, 'vertical')).toBe('inset(0 0 100% 0)')
  })

  it('非法输入抛错', () => {
    expect(() => clipPathFor(NaN, 'horizontal')).toThrow('滑块位置无效')
  })
})

describe('handlePosition', () => {
  it('horizontal 返回 left 百分比', () => {
    expect(handlePosition(30, 'horizontal')).toEqual({ left: '30%' })
    expect(handlePosition(0, 'horizontal')).toEqual({ left: '0%' })
  })

  it('vertical 返回 top 百分比', () => {
    expect(handlePosition(70, 'vertical')).toEqual({ top: '70%' })
    expect(handlePosition(100, 'vertical')).toEqual({ top: '100%' })
  })

  it('越界先钳制', () => {
    expect(handlePosition(130, 'horizontal')).toEqual({ left: '100%' })
  })
})

describe('stepPercent', () => {
  it('键盘步进 ±KEYBOARD_STEP', () => {
    expect(stepPercent(50, KEYBOARD_STEP)).toBe(52)
    expect(stepPercent(50, -KEYBOARD_STEP)).toBe(48)
  })

  it('上下溢出钳制', () => {
    expect(stepPercent(99, KEYBOARD_STEP)).toBe(100)
    expect(stepPercent(1, -KEYBOARD_STEP)).toBe(0)
  })

  it('非法输入抛错', () => {
    expect(() => stepPercent(NaN, KEYBOARD_STEP)).toThrow('滑块位置无效')
  })
})

describe('percentFromPointer', () => {
  it('按指针位置换算百分比', () => {
    expect(percentFromPointer(400, 0, 800)).toBe(50)
    expect(percentFromPointer(0, 0, 800)).toBe(0)
    expect(percentFromPointer(800, 0, 800)).toBe(100)
  })

  it('考虑轨道起始偏移', () => {
    expect(percentFromPointer(150, 100, 200)).toBe(25)
  })

  it('span 为 0 或负数返回 null（容器未布局时忽略本次更新）', () => {
    expect(percentFromPointer(100, 0, 0)).toBeNull()
    expect(percentFromPointer(100, 0, -10)).toBeNull()
  })

  it('指针超出轨道钳制到 0–100', () => {
    expect(percentFromPointer(900, 0, 800)).toBe(100)
    expect(percentFromPointer(-50, 0, 800)).toBe(0)
  })
})

describe('percentFromClientRect', () => {
  const rect = { left: 100, top: 50, width: 800, height: 600 }

  it('horizontal 取横轴（clientX/left/width）', () => {
    // clientX=500 → (500-100)/800 = 50%
    expect(percentFromClientRect(500, 999, rect, 'horizontal')).toBe(50)
  })

  it('vertical 取纵轴（clientY/top/height）', () => {
    // clientY=200 → (200-50)/600 = 25%
    expect(percentFromClientRect(999, 200, rect, 'vertical')).toBe(25)
  })

  it('对应轴长度为 0 返回 null', () => {
    expect(percentFromClientRect(500, 200, { ...rect, width: 0 }, 'horizontal')).toBeNull()
    expect(percentFromClientRect(500, 200, { ...rect, height: 0 }, 'vertical')).toBeNull()
  })
})

describe('aspectStyle', () => {
  it('返回 aspectRatio 样式', () => {
    expect(aspectStyle(800, 600)).toEqual({ aspectRatio: '800 / 600' })
    expect(aspectStyle(1920, 1080)).toEqual({ aspectRatio: '1920 / 1080' })
  })

  it('非正或非有限尺寸抛错', () => {
    expect(() => aspectStyle(0, 600)).toThrow('图片尺寸无效')
    expect(() => aspectStyle(800, 0)).toThrow('图片尺寸无效')
    expect(() => aspectStyle(-800, 600)).toThrow('图片尺寸无效')
    expect(() => aspectStyle(NaN, 600)).toThrow('图片尺寸无效')
    expect(() => aspectStyle(800, Infinity)).toThrow('图片尺寸无效')
  })
})
