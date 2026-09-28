/**
 * mouse-test（#833）utils 单测：按键描述、双击判定、滚轮方向。
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DOUBLE_CLICK_MS,
  MAX_CLICK_RECORDS,
  describeMouseButton,
  formatClickRecord,
  trackClicks,
  wheelDeltaText,
} from './utils'

describe('describeMouseButton', () => {
  it('0/1/2 为左/中/右键', () => {
    expect(describeMouseButton(0)).toBe('左键')
    expect(describeMouseButton(1)).toBe('中键')
    expect(describeMouseButton(2)).toBe('右键')
  })
  it('未知按键编号原样输出', () => {
    expect(describeMouseButton(3)).toBe('按键 3')
    expect(describeMouseButton(-1)).toBe('按键 -1')
  })
})

describe('trackClicks', () => {
  it('首次点击非双击', () => {
    const r = trackClicks([], { button: 0, clientX: 10, clientY: 20 }, 1000)
    expect(r.isDouble).toBe(false)
    expect(r.clicks).toHaveLength(1)
    expect(r.clicks[0]).toEqual({ x: 10, y: 20, button: 0, time: 1000 })
  })
  it('阈值内同键点击判定为双击', () => {
    const first = trackClicks([], { button: 0, clientX: 1, clientY: 1 }, 1000)
    const second = trackClicks(
      first.clicks,
      { button: 0, clientX: 2, clientY: 2 },
      1000 + DEFAULT_DOUBLE_CLICK_MS - 1,
    )
    expect(second.isDouble).toBe(true)
  })
  it('边界值等于阈值仍算双击', () => {
    const first = trackClicks([], { button: 0, clientX: 1, clientY: 1 }, 1000)
    const second = trackClicks(
      first.clicks,
      { button: 0, clientX: 2, clientY: 2 },
      1000 + DEFAULT_DOUBLE_CLICK_MS,
    )
    expect(second.isDouble).toBe(true)
  })
  it('超过阈值不算双击', () => {
    const first = trackClicks([], { button: 0, clientX: 1, clientY: 1 }, 1000)
    const second = trackClicks(
      first.clicks,
      { button: 0, clientX: 2, clientY: 2 },
      1000 + DEFAULT_DOUBLE_CLICK_MS + 1,
    )
    expect(second.isDouble).toBe(false)
  })
  it('不同按键不算双击', () => {
    const first = trackClicks([], { button: 0, clientX: 1, clientY: 1 }, 1000)
    const second = trackClicks(first.clicks, { button: 2, clientX: 2, clientY: 2 }, 1100)
    expect(second.isDouble).toBe(false)
  })
  it('时间倒流不算双击', () => {
    const first = trackClicks([], { button: 0, clientX: 1, clientY: 1 }, 1000)
    const second = trackClicks(first.clicks, { button: 0, clientX: 2, clientY: 2 }, 999)
    expect(second.isDouble).toBe(false)
  })
  it('自定义阈值生效', () => {
    const first = trackClicks([], { button: 0, clientX: 1, clientY: 1 }, 1000)
    const second = trackClicks(first.clicks, { button: 0, clientX: 2, clientY: 2 }, 1200, 100)
    expect(second.isDouble).toBe(false)
  })
  it('记录超过上限时只保留最近 50 条', () => {
    let clicks = trackClicks([], { button: 0, clientX: 0, clientY: 0 }, 0).clicks
    for (let i = 1; i <= MAX_CLICK_RECORDS + 5; i++) {
      clicks = trackClicks(clicks, { button: 0, clientX: i, clientY: i }, i).clicks
    }
    expect(clicks).toHaveLength(MAX_CLICK_RECORDS)
    expect(clicks[0]?.x).toBe(6)
  })
  it('不修改传入的记录数组', () => {
    const prev = trackClicks([], { button: 0, clientX: 0, clientY: 0 }, 0).clicks
    trackClicks(prev, { button: 0, clientX: 1, clientY: 1 }, 1)
    expect(prev).toHaveLength(1)
  })
})

describe('wheelDeltaText', () => {
  it('正值向下滚动', () => {
    expect(wheelDeltaText(100)).toBe('向下滚动')
  })
  it('负值向上滚动', () => {
    expect(wheelDeltaText(-100)).toBe('向上滚动')
  })
  it('0 为无滚动', () => {
    expect(wheelDeltaText(0)).toBe('无滚动')
  })
})

describe('formatClickRecord', () => {
  it('输出按键名与坐标', () => {
    expect(formatClickRecord({ x: 3, y: 4, button: 2, time: 0 })).toBe('右键 @ (3, 4)')
  })
})
