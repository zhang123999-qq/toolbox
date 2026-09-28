import { describe, expect, it } from 'vitest'
import {
  MAX_BARS,
  MAX_BEATS_PER_BAR,
  MAX_BPM,
  MIN_BPM,
  assertValidMetronomeOptions,
  barDurationSec,
  beatIntervalSec,
  currentBeatInBar,
  formatMetronomeLabel,
  generateBeatSchedule,
} from './utils'

describe('metronome / 参数校验', () => {
  it('合法参数通过', () => {
    expect(() => assertValidMetronomeOptions(120, 4, 4)).not.toThrow()
    expect(() => assertValidMetronomeOptions(MIN_BPM, 1, 1)).not.toThrow()
    expect(() => assertValidMetronomeOptions(MAX_BPM, MAX_BEATS_PER_BAR, 16)).not.toThrow()
  })

  it('BPM 非法抛中文错：非数字 / 过小 / 过大 / NaN / Infinity', () => {
    for (const bad of [19, 321, Number.NaN, Number.POSITIVE_INFINITY, 0, -60]) {
      expect(() => assertValidMetronomeOptions(bad, 4, 4)).toThrow(/BPM 非法/)
    }
  })

  it('每小节拍数非法抛中文错：非整数 / 过小 / 过大', () => {
    for (const bad of [0, 13, 2.5, Number.NaN]) {
      expect(() => assertValidMetronomeOptions(120, bad, 4)).toThrow(/每小节拍数非法/)
    }
  })

  it('拍号分母非法抛中文错', () => {
    for (const bad of [3, 5, 32, Number.NaN]) {
      expect(() => assertValidMetronomeOptions(120, 4, bad)).toThrow(/拍号分母非法/)
    }
  })
})

describe('metronome / 拍间隔与小节时长', () => {
  it('4/4 拍 120 BPM：每拍 0.5 秒', () => {
    expect(beatIntervalSec(120, 4)).toBeCloseTo(0.5, 10)
  })

  it('拍号分母折算：8 分音符为一拍时间隔减半，2 分音符为一拍时间隔翻倍', () => {
    expect(beatIntervalSec(120, 8)).toBeCloseTo(0.25, 10)
    expect(beatIntervalSec(120, 2)).toBeCloseTo(1, 10)
    expect(beatIntervalSec(120, 16)).toBeCloseTo(0.125, 10)
    expect(beatIntervalSec(120, 1)).toBeCloseTo(2, 10)
  })

  it('60 BPM 时每拍 1 秒', () => {
    expect(beatIntervalSec(60, 4)).toBeCloseTo(1, 10)
  })

  it('小节时长 = 拍数 × 拍间隔', () => {
    expect(barDurationSec(120, 4, 4)).toBeCloseTo(2, 10)
    expect(barDurationSec(120, 3, 8)).toBeCloseTo(0.75, 10)
  })

  it('参数非法时抛中文错', () => {
    expect(() => beatIntervalSec(10, 4)).toThrow(/BPM 非法/)
    expect(() => beatIntervalSec(120, 3)).toThrow(/拍号分母非法/)
    expect(() => barDurationSec(120, 0, 4)).toThrow(/每小节拍数非法/)
  })
})

describe('metronome / 拍点序列', () => {
  it('2 小节 4/4 拍：8 个拍点，第 1 拍重拍、时间递增 0.5 秒', () => {
    const seq = generateBeatSchedule(120, 4, 4, 2)
    expect(seq.length).toBe(8)
    expect(seq[0]).toEqual({ bar: 1, beatInBar: 1, timeSec: 0, accented: true })
    expect(seq[1]).toEqual({ bar: 1, beatInBar: 2, timeSec: 0.5, accented: false })
    expect(seq[4]).toEqual({ bar: 2, beatInBar: 1, timeSec: 2, accented: true })
    expect(seq[7]).toEqual({ bar: 2, beatInBar: 4, timeSec: 3.5, accented: false })
  })

  it('3/4 拍：每小节第 1 拍重拍', () => {
    const seq = generateBeatSchedule(90, 3, 4, 2)
    expect(seq.length).toBe(6)
    expect(seq.filter((e) => e.accented).map((e) => e.beatInBar)).toEqual([1, 1])
    expect(seq[3]!.bar).toBe(2)
  })

  it('单拍子（1/4）：每拍都是重拍', () => {
    const seq = generateBeatSchedule(100, 1, 4, 3)
    expect(seq.every((e) => e.accented)).toBe(true)
    expect(seq.length).toBe(3)
  })

  it('小节数非法抛中文错：0 / 非整数 / 超上限 / NaN', () => {
    for (const bad of [0, -1, 1.5, MAX_BARS + 1, Number.NaN]) {
      expect(() => generateBeatSchedule(120, 4, 4, bad)).toThrow(/小节数非法/)
    }
  })

  it('BPM 非法时生成序列抛错', () => {
    expect(() => generateBeatSchedule(500, 4, 4, 2)).toThrow(/BPM 非法/)
  })
})

describe('metronome / 当前拍计算', () => {
  it('按已播放时长定位小节内拍号', () => {
    // 0.5 秒一拍，每小节 4 拍
    expect(currentBeatInBar(0, 0.5, 4)).toBe(1)
    expect(currentBeatInBar(0.49, 0.5, 4)).toBe(1)
    expect(currentBeatInBar(0.5, 0.5, 4)).toBe(2)
    expect(currentBeatInBar(1.99, 0.5, 4)).toBe(4)
    expect(currentBeatInBar(2, 0.5, 4)).toBe(1)
    expect(currentBeatInBar(2.5, 0.5, 4)).toBe(2)
  })

  it('参数非法抛中文错', () => {
    expect(() => currentBeatInBar(-1, 0.5, 4)).toThrow(/已播放时长非法/)
    expect(() => currentBeatInBar(Number.NaN, 0.5, 4)).toThrow(/已播放时长非法/)
    expect(() => currentBeatInBar(1, 0, 4)).toThrow(/拍间隔非法/)
    expect(() => currentBeatInBar(1, -0.5, 4)).toThrow(/拍间隔非法/)
    expect(() => currentBeatInBar(1, Number.NaN, 4)).toThrow(/拍间隔非法/)
    expect(() => currentBeatInBar(1, 0.5, 0)).toThrow(/每小节拍数非法/)
    expect(() => currentBeatInBar(1, 0.5, 2.5)).toThrow(/每小节拍数非法/)
  })
})

describe('metronome / 标签', () => {
  it('生成中文摘要标签', () => {
    expect(formatMetronomeLabel(120, 4, 4)).toBe('120 BPM · 4/4 拍')
    expect(formatMetronomeLabel(90, 3, 8)).toBe('90 BPM · 3/8 拍')
  })

  it('参数非法时抛中文错', () => {
    expect(() => formatMetronomeLabel(10, 4, 4)).toThrow(/BPM 非法/)
  })
})
