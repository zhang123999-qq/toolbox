import type { SunriseInput, SunriseOptions } from './schema'

/**
 * sunrise —— 日出 / 日落
 *
 * 算法来源：NOAA（美国国家海洋和大气管理局）Solar Position Calculator 的
 * 「分数年」简化模型（NOAA ESRL 公开公式）。
 * 参考：https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * 纯自研，不依赖 suncalc 等任何库。
 *
 * 公式链：
 *   1. 分数年 γ = 2π/365 · (年积日 - 1)
 *   2. 太阳赤纬 δ（弧度，NOAA 傅里叶展开）
 *        δ = 0.006918 - 0.399912·cosγ + 0.070257·sinγ
 *            - 0.006758·cos2γ + 0.000907·sin2γ
 *            - 0.002697·cos3γ + 0.00148·sin3γ
 *   3. 均时差 EoT（分钟）
 *        EoT = 229.18·(0.000075 + 0.001868·cosγ - 0.032077·sinγ
 *                     - 0.014615·cos2γ - 0.040849·sin2γ)
 *   4. 日出时角 cosH = [cos(90.833°) - sinφ·sinδ] / (cosφ·cosδ)
 *      （90.833° = 几何天顶角，含大气折射 34′ 与太阳视半径 16′）
 *   5. UTC 正午 = 720 - 4·λ - EoT；日出 = 正午 - 4H，日落 = 正午 + 4H，再按时区偏移换算
 *
 * 精度：中纬度地区日出/日落时刻误差通常 < 1 分钟；极区与闰年边界约 ±1~2 分钟。
 */

const D2R = Math.PI / 180

/** 官方日出/日落天顶角（含大气折射 + 太阳视半径修正） */
const ZENITH = 90.833

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 年积日（1 起）：1 月 1 日 = 1 */
export function dayOfYear(y: number, m: number, d: number): number {
  const start = Date.UTC(y, 0, 1)
  const cur = Date.UTC(y, m - 1, d)
  return Math.floor((cur - start) / 86400000) + 1
}

/** NOAA 分数年模型：由公历日给出太阳赤纬（度）与均时差（分钟） */
export function solarPosition(y: number, m: number, d: number): { decl: number; eot: number } {
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear(y, m, d) - 1)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)
  const eot =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  return { decl: decl / D2R, eot }
}

export interface SunTimes {
  /** 日出（当地时间，分钟自当地 0 时起）；极昼极夜时为 null */
  sunrise: number | null
  sunset: number | null
  /** 正午（当地时间，分钟） */
  noon: number
  /** 昼长（分钟）；极昼=24*60，极夜=0 */
  dayLength: number
  decl: number
  eot: number
  /** 极昼 / 极夜 / 正常 */
  polar: 'none' | 'day' | 'night'
}

/** 由日期 + 纬度 + 经度 + 时区偏移（小时）计算日出日落 */
export function computeSunTimes(
  y: number,
  m: number,
  d: number,
  lat: number,
  lon: number,
  tz: number,
): SunTimes {
  const { decl, eot } = solarPosition(y, m, d)

  // 当地正午（UT 分钟）= 720 - 4·经度 - EoT
  const solarNoonUt = 720 - 4 * lon - eot
  const noonLocal = solarNoonUt + tz * 60

  const cosLat = Math.cos(lat * D2R)
  const cosDecl = Math.cos(decl * D2R)
  // 日出时角：cosH = (cos zenith - sinφ·sinδ)/(cosφ·cosδ)
  const cosH =
    (Math.cos(ZENITH * D2R) - Math.sin(lat * D2R) * Math.sin(decl * D2R)) / (cosLat * cosDecl)

  if (cosH > 1) {
    // 太阳整日低于地平线 → 极夜
    return { sunrise: null, sunset: null, noon: noonLocal, dayLength: 0, decl, eot, polar: 'night' }
  }
  if (cosH < -1) {
    // 太阳整日不落地平线 → 极昼
    return {
      sunrise: null,
      sunset: null,
      noon: noonLocal,
      dayLength: 24 * 60,
      decl,
      eot,
      polar: 'day',
    }
  }

  const H = Math.acos(cosH) / D2R // 度
  const sunriseUt = solarNoonUt - 4 * H
  const sunsetUt = solarNoonUt + 4 * H
  return {
    sunrise: sunriseUt + tz * 60,
    sunset: sunsetUt + tz * 60,
    noon: noonLocal,
    dayLength: sunsetUt - sunriseUt,
    decl,
    eot,
    polar: 'none',
  }
}

/** 分钟（自当地 0 时）→ "HH:MM" */
export function fmtClock(minutes: number): string {
  let m = Math.round(minutes)
  m = ((m % 1440) + 1440) % 1440
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`
}

/** 分钟 → "X小时YY分" */
export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const mm = Math.round(minutes % 60)
  return `${h}小时${pad2(mm)}分`
}

export interface ParsedLocation {
  y: number
  m: number
  d: number
  lat: number
  lon: number
  tz: number
}

/**
 * 解析输入。支持两种写法：
 *   ① 键值行（推荐，示例即用）：
 *        日期: 2025-06-21
 *        纬度: 39.9
 *        经度: 116.4
 *        时区: +8
 *   ② 紧凑位置式：`2025-06-21 39.9 116.4 +8`（日期 纬度 经度 时区）
 * 纬度可带 N/S 后缀，经度可带 E/W 后缀；时区缺省按 +8（中国标准时间）。
 */
export function parseSunriseInput(text: string): ParsedLocation {
  const dm = text.match(/(\d{4})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{1,2})/)
  if (!dm) throw new Error('无法识别日期，请使用 YYYY-MM-DD')
  const y = Number(dm[1])
  const m = Number(dm[2])
  const d = Number(dm[3])
  const probe = new Date(y, m - 1, d)
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    throw new Error('非法日期：' + dm[0])
  }

  let lat: number | undefined
  let lon: number | undefined
  let tz: number | undefined

  // ① 键值行
  const lines = text.split(/[\n|]/)
  for (const line of lines) {
    const numMatch = line.match(/([+-]?\d+(?:\.\d+)?)\s*([NSEWnsew])?/)
    if (!numMatch) continue
    const num = Number(numMatch[1])
    const dir = numMatch[2]?.toUpperCase() ?? ''
    if (/纬度|^\s*lat/i.test(line)) {
      lat = dir === 'S' ? -Math.abs(num) : dir === 'N' ? Math.abs(num) : num
    } else if (/经度|^\s*lon/i.test(line)) {
      lon = dir === 'W' ? -Math.abs(num) : dir === 'E' ? Math.abs(num) : num
    } else if (/时区|^\s*tz|utc/i.test(line)) {
      tz = num
    }
  }

  // ② 位置式兜底：去掉日期后剩余的数字依次为 纬度 经度 时区
  if (lat === undefined || lon === undefined) {
    const rest = text.replace(dm[0], ' ')
    const nums = rest.match(/[+-]?\d+(?:\.\d+)?/g) ?? []
    const vals = nums.map(Number)
    if (lat === undefined) lat = vals[0]
    if (lon === undefined) lon = vals[1]
    if (tz === undefined && vals[2] !== undefined) tz = vals[2]
  }

  if (lat === undefined || Number.isNaN(lat)) throw new Error('缺少纬度（纬度范围 -90 ~ 90）')
  if (lon === undefined || Number.isNaN(lon)) throw new Error('缺少经度（经度范围 -180 ~ 180）')
  if (lat < -90 || lat > 90) throw new Error('纬度超出范围（-90 ~ 90）：' + lat)
  if (lon < -180 || lon > 180) throw new Error('经度超出范围（-180 ~ 180）：' + lon)
  if (tz === undefined) tz = 8
  if (tz < -12 || tz > 14) throw new Error('时区偏移超出范围（-12 ~ 14）：' + tz)

  return { y, m, d, lat, lon, tz }
}

function fmtLatLon(v: number, pos: string, neg: string): string {
  const dir = v >= 0 ? pos : neg
  return `${Math.abs(v).toFixed(2)}°${dir}`
}

/** T2 同步入口 */
export function transform(input: SunriseInput, _options: SunriseOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const { y, m, d, lat, lon, tz } = parseSunriseInput(text)
  const s = computeSunTimes(y, m, d, lat, lon, tz)
  const tzLabel = (tz >= 0 ? '+' : '') + String(tz)

  const head = [
    `日期：${y}-${pad2(m)}-${pad2(d)}`,
    `位置：${fmtLatLon(lat, 'N', 'S')}  ${fmtLatLon(lon, 'E', 'W')}  时区：UTC${tzLabel}`,
    `太阳赤纬：${s.decl >= 0 ? '+' : ''}${s.decl.toFixed(2)}°`,
    `均时差 EoT：${s.eot >= 0 ? '+' : ''}${s.eot.toFixed(1)} 分钟`,
  ]

  if (s.polar === 'day') {
    return [
      ...head,
      '现象：极昼（太阳整日不落地平线）',
      `正午：${fmtClock(s.noon)}`,
      `昼长：24小时00分`,
    ].join('\n')
  }
  if (s.polar === 'night') {
    return [
      ...head,
      '现象：极夜（太阳整日不升起）',
      `正午：${fmtClock(s.noon)}`,
      '昼长：0小时00分',
    ].join('\n')
  }

  return [
    ...head,
    `日出：${fmtClock(s.sunrise as number)}`,
    `正午：${fmtClock(s.noon)}`,
    `日落：${fmtClock(s.sunset as number)}`,
    `昼长：${fmtDuration(s.dayLength)}`,
  ].join('\n')
}
