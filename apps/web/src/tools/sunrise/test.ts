import { describe, expect, it } from 'vitest'
import {
  computeSunTimes,
  dayOfYear,
  fmtClock,
  parseSunriseInput,
  solarPosition,
  transform,
} from './utils'

/** "HH:MM" → 自 0:00 起的分钟数 */
function toMin(clock: string): number {
  const [h, m] = clock.split(':').map(Number)
  return h * 60 + m
}

const BEIJING = { lat: 39.9, lon: 116.4, tz: 8 }
const NEWYORK = { lat: 40.71, lon: -74.0, tz: -4 }

describe('sunrise / solarPosition（NOAA 分数年模型）', () => {
  it('夏至日太阳赤纬 ≈ +23.44°（北回归线）', () => {
    const { decl } = solarPosition(2025, 6, 21)
    expect(decl).toBeGreaterThan(23.0)
    expect(decl).toBeLessThan(23.9)
  })

  it('冬至日太阳赤纬 ≈ -23.44°', () => {
    const { decl } = solarPosition(2025, 12, 21)
    expect(decl).toBeGreaterThan(-23.9)
    expect(decl).toBeLessThan(-23.0)
  })

  it('春秋分日赤纬 ≈ 0°', () => {
    expect(Math.abs(solarPosition(2025, 3, 20).decl)).toBeLessThan(1)
    expect(Math.abs(solarPosition(2025, 9, 22).decl)).toBeLessThan(1)
  })

  it('年积日：1 月 1 日 = 1，12 月 31 日平年 = 365', () => {
    expect(dayOfYear(2025, 1, 1)).toBe(1)
    expect(dayOfYear(2025, 12, 31)).toBe(365)
    expect(dayOfYear(2024, 12, 31)).toBe(366) // 闰年
  })
})

describe('sunrise / computeSunTimes（与权威值对照，容差 ±5 分钟）', () => {
  it('2025-06-21 北京：日出 ≈ 04:45，日落 ≈ 19:46', () => {
    const s = computeSunTimes(2025, 6, 21, BEIJING.lat, BEIJING.lon, BEIJING.tz)
    expect(s.polar).toBe('none')
    expect(Math.abs(toMin(fmtClock(s.sunrise as number)) - toMin('04:45'))).toBeLessThan(5)
    expect(Math.abs(toMin(fmtClock(s.sunset as number)) - toMin('19:46'))).toBeLessThan(5)
  })

  it('2025-06-21 纽约（EDT, UTC-4）：日出 ≈ 05:24，日落 ≈ 20:30', () => {
    const s = computeSunTimes(2025, 6, 21, NEWYORK.lat, NEWYORK.lon, NEWYORK.tz)
    expect(Math.abs(toMin(fmtClock(s.sunrise as number)) - toMin('05:24'))).toBeLessThan(5)
    expect(Math.abs(toMin(fmtClock(s.sunset as number)) - toMin('20:30'))).toBeLessThan(5)
  })

  it('春秋分昼长 ≈ 12 小时（北京）', () => {
    const s = computeSunTimes(2025, 3, 20, BEIJING.lat, BEIJING.lon, BEIJING.tz)
    expect(Math.abs(s.dayLength / 60 - 12)).toBeLessThan(0.5)
  })

  it('冬至昼长为全年最短（北京 ≈ 9.3 小时）', () => {
    const s = computeSunTimes(2025, 12, 21, BEIJING.lat, BEIJING.lon, BEIJING.tz)
    expect(s.dayLength / 60).toBeGreaterThan(9.0)
    expect(s.dayLength / 60).toBeLessThan(9.8)
  })

  it('北极圈内夏至为极昼（斯瓦尔巴 78°N）', () => {
    const s = computeSunTimes(2025, 6, 21, 78.0, 15.0, 1)
    expect(s.polar).toBe('day')
    expect(s.sunrise).toBeNull()
    expect(s.sunset).toBeNull()
    expect(s.dayLength).toBe(24 * 60)
  })

  it('北极圈内冬至为极夜', () => {
    const s = computeSunTimes(2025, 12, 21, 78.0, 15.0, 1)
    expect(s.polar).toBe('night')
    expect(s.dayLength).toBe(0)
  })
})

describe('sunrise / parseSunriseInput（校验）', () => {
  it('键值行解析出日期/纬度/经度/时区', () => {
    const p = parseSunriseInput(
      ['日期: 2025-06-21', '纬度: 39.9', '经度: 116.4', '时区: +8'].join('\n'),
    )
    expect(p).toEqual({ y: 2025, m: 6, d: 21, lat: 39.9, lon: 116.4, tz: 8 })
  })

  it('紧凑位置式 `2025-06-21 39.9 116.4 8` 也可解析', () => {
    const p = parseSunriseInput('2025-06-21 39.9 116.4 8')
    expect(p.lat).toBe(39.9)
    expect(p.lon).toBe(116.4)
    expect(p.tz).toBe(8)
  })

  it('N/S、E/W 后缀决定正负号', () => {
    const s = parseSunriseInput('日期: 2025-06-21\n纬度: 33.8 S\n经度: 151.2 E\n时区: +10')
    expect(s.lat).toBeCloseTo(-33.8)
    expect(s.lon).toBeCloseTo(151.2)
  })

  it('纬度越界（>90 / <-90）报错', () => {
    expect(() => parseSunriseInput('日期: 2025-06-21\n纬度: 95\n经度: 116.4')).toThrow(
      /纬度超出范围/,
    )
    expect(() => parseSunriseInput('日期: 2025-06-21\n纬度: -95\n经度: 116.4')).toThrow(
      /纬度超出范围/,
    )
  })

  it('经度越界（>180 / <-180）报错', () => {
    expect(() => parseSunriseInput('日期: 2025-06-21\n纬度: 39.9\n经度: 190')).toThrow(
      /经度超出范围/,
    )
    expect(() => parseSunriseInput('日期: 2025-06-21\n纬度: 39.9\n经度: -190')).toThrow(
      /经度超出范围/,
    )
  })

  it('非法日期（2 月 30 日）报错', () => {
    expect(() => parseSunriseInput('日期: 2025-02-30\n纬度: 39.9\n经度: 116.4')).toThrow(/非法日期/)
  })

  it('缺日期报错', () => {
    expect(() => parseSunriseInput('纬度: 39.9\n经度: 116.4')).toThrow(/无法识别日期/)
  })
})

describe('sunrise / transform（T2 入口）', () => {
  const base = ['日期: 2025-06-21', '纬度: 39.9', '经度: 116.4', '时区: +8'].join('\n')

  it('输出包含日出/正午/日落/昼长', () => {
    const out = transform({ text: base }, {})
    expect(out).toContain('日出：')
    expect(out).toContain('正午：')
    expect(out).toContain('日落：')
    expect(out).toContain('昼长：')
  })

  it('极昼地区明确标注「极昼」', () => {
    const out = transform({ text: '日期: 2025-06-21\n纬度: 78\n经度: 15\n时区: 1' }, {})
    expect(out).toContain('极昼')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
    expect(transform({ text: '   ' }, {})).toBe('')
  })

  it('输入超过上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
