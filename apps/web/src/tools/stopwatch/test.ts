import { describe, expect, it } from 'vitest'
import { addLap, computeElapsed, formatSw, lapSplit, resetSw, swText } from './utils'

describe('stopwatch / formatSw', () => {
  it('0 毫秒显示 00:00.00', () => {
    expect(formatSw(0)).toBe('00:00.00')
  })

  it('毫米级与秒分格式化', () => {
    expect(formatSw(1234)).toBe('00:01.23')
    expect(formatSw(65123)).toBe('01:05.12')
  })

  it('超过 1 小时显示 h:mm:ss.cs', () => {
    expect(formatSw(3661234)).toBe('1:01:01.23')
  })
})

describe('stopwatch / lap', () => {
  it('第一次计次的分段就是累计值', () => {
    expect(lapSplit([], 1000)).toBe(1000)
  })

  it('后续分段 = 本次累计 - 上次累计', () => {
    expect(lapSplit([1000, 2500], 4000)).toBe(1500)
  })

  it('addLap 不可变追加', () => {
    const next = addLap([100, 200], 300)
    expect(next).toEqual([100, 200, 300])
  })

  it('resetSw 清零', () => {
    expect(resetSw()).toEqual({ elapsed: 0, laps: [] })
  })
})

describe('stopwatch / computeElapsed（时间戳锚定）', () => {
  it('未启动（startedAt=null）返回 base', () => {
    expect(computeElapsed(0, null, 1000)).toBe(0)
    expect(computeElapsed(5000, null, 1000)).toBe(5000)
  })

  it('走动中 = base + (now − startedAt)', () => {
    expect(computeElapsed(0, 1000, 1500)).toBe(500)
    expect(computeElapsed(3000, 1000, 2500)).toBe(4500)
  })

  it('now 早于 startedAt 时不返回负数', () => {
    expect(computeElapsed(0, 2000, 1000)).toBe(0)
  })

  it('模拟暂停-继续：暂停时把当前段并入 base，继续后重新计时', () => {
    // 开始：startedAt=1000
    // 暂停于 now=2500：base = 0 + (2500-1000) = 1500，startedAt=null
    const base = computeElapsed(0, 1000, 2500)
    expect(base).toBe(1500)
    // 继续于 now=5000：startedAt=5000
    // 此刻 now=6000：elapsed = 1500 + (6000-5000) = 2500
    expect(computeElapsed(base, 5000, 6000)).toBe(2500)
  })

  it('后台节流场景：间隔 1000ms 但实际经过 1000ms，显示真实时长', () => {
    // 模拟 setInterval 被节流到 1000ms：startedAt=0，第一次 tick 在 now=1000
    expect(computeElapsed(0, 0, 1000)).toBe(1000)
    // 即使下一次 tick 在 now=5000（被节流 4 秒），显示仍是 5000 而非累加值
    expect(computeElapsed(0, 0, 5000)).toBe(5000)
  })
})

describe('stopwatch / swText', () => {
  it('无计时返回空串', () => {
    expect(swText(0, [])).toBe('')
  })

  it('汇总总计与各分段', () => {
    const text = swText(4000, [1000, 2500])
    expect(text).toContain('总计：00:04.00')
    expect(text).toContain('第 1 次：分段 00:01.00')
    expect(text).toContain('第 2 次：分段 00:01.50')
  })
})
