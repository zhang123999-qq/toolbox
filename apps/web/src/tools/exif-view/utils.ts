/**
 * exif-view 纯函数：EXIF 标签分类、格式化、文件校验。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */
import { formatBytes } from '../../lib/image'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** parse 返回空/undefined 时的错误文案（Tool 凭此识别"无 EXIF"友好提示分支） */
export const NO_EXIF_MESSAGE = '未找到 EXIF 信息'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 非图片文件错误（Tool 捕获后展示本地化文案，不依赖 t() 返回值比对） */
export class UnsupportedFileError extends Error {
  constructor() {
    super('unsupported file type')
    this.name = 'UnsupportedFileError'
  }
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 无 EXIF 数据时抛错；通过后 data 收窄为标签对象 */
export function assertExifFound(data: unknown): asserts data is Record<string, unknown> {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error(NO_EXIF_MESSAGE)
  }
}

/** 数字保留最多 2 位小数，去掉浮点噪声（如 2.7999999 → 2.8） */
function trimNumber(v: number): number {
  return Math.round(v * 100) / 100
}

function formatLatitude(lat: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`
}

function formatLongitude(lon: number): string {
  return `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`
}

/** GPS 十进制组合："39.9042°N, 116.4074°E"；任一非法返回 '—' */
export function formatGps(lat: unknown, lon: unknown): string {
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return '—'
  }
  return `${formatLatitude(lat)}, ${formatLongitude(lon)}`
}

/** 十进制转度分秒："39°54′15.1″N"；非法返回 '—' */
export function decimalToDms(value: unknown, kind: 'lat' | 'lon'): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const sec = (minFloat - min) * 60
  const suffix = kind === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  return `${deg}°${min}′${sec.toFixed(1)}″${suffix}`
}

/** 快门：秒数 → "1/250 s"；≥1 秒显示 "2 s"；非法返回 '—' */
export function formatExposureTime(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return '—'
  if (v >= 1) return `${trimNumber(v)} s`
  return `1/${Math.round(1 / v)} s`
}

/** 光圈："f/2.8"；非法返回 '—' */
export function formatAperture(f: unknown): string {
  if (typeof f !== 'number' || !Number.isFinite(f) || f <= 0) return '—'
  return `f/${trimNumber(f)}`
}

/** 焦距："50 mm"；非法返回 '—' */
export function formatFocalLength(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return '—'
  return `${trimNumber(v)} mm`
}

/** 拍摄时间：Date → "YYYY-MM-DD HH:mm:ss"；字符串原样返回；其他返回 '—' */
export function formatDateTime(v: unknown): string {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '—'
    const p = (n: number): string => String(n).padStart(2, '0')
    return (
      `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ` +
      `${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`
    )
  }
  if (typeof v === 'string') return v
  return '—'
}

/** 通用标签值转字符串：null/undefined → '—'；Date 格式化；数组逗号连接 */
export function stringifyTagValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (v instanceof Date) return formatDateTime(v)
  if (Array.isArray(v)) return v.map((x) => stringifyTagValue(x)).join(', ')
  return String(v)
}

const FLASH_TEXT: Record<number, string> = {
  0: '未闪光',
  1: '闪光',
  9: '闪光（强制开启）',
  25: '闪光（自动）',
}

/** 闪光灯：常见编码转中文，未知编码回退为原始值 */
export function formatFlash(v: unknown): string {
  if (typeof v === 'number' && Number.isInteger(v) && v in FLASH_TEXT) return FLASH_TEXT[v]
  return stringifyTagValue(v)
}

export interface ExifRow {
  /** 行标识：已知标签用稳定 id（如 'fNumber'），未知标签用原始键名 */
  key: string
  value: string
}

export interface CategorizedTags {
  shooting: ExifRow[]
  gps: ExifRow[]
  others: ExifRow[]
}

/** 拍摄参数：原始键名 → 行 id（保持展示顺序） */
const SHOOTING_KEYS: ReadonlyArray<readonly [string, string]> = [
  ['Make', 'make'],
  ['Model', 'model'],
  ['FNumber', 'fNumber'],
  ['ExposureTime', 'exposureTime'],
  ['ISO', 'iso'],
  ['FocalLength', 'focalLength'],
  ['DateTimeOriginal', 'dateTimeOriginal'],
  ['Flash', 'flash'],
  ['ExposureProgram', 'exposureProgram'],
]

const SHOOTING_RAW_KEYS = new Set(SHOOTING_KEYS.map(([raw]) => raw))

/** GPS 相关键（单独成组，不进入"其他标签"） */
const GPS_RAW_KEYS = new Set([
  'GPSLatitude',
  'GPSLongitude',
  'GPSAltitude',
  'GPSLatitudeRef',
  'GPSLongitudeRef',
  'GPSAltitudeRef',
  'latitude',
  'longitude',
])

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== ''
}

function formatShootingValue(rawKey: string, v: unknown): string {
  switch (rawKey) {
    case 'FNumber':
      return formatAperture(v)
    case 'ExposureTime':
      return formatExposureTime(v)
    case 'FocalLength':
      return formatFocalLength(v)
    case 'DateTimeOriginal':
      return formatDateTime(v)
    case 'Flash':
      return formatFlash(v)
    default:
      return stringifyTagValue(v)
  }
}

/** GPS 原始值转十进制：数字直接用；[度,分,秒] 数组按 Ref 决定符号 */
function toDecimalDegrees(value: unknown, ref: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((x) => typeof x === 'number' && Number.isFinite(x))
  ) {
    const [d, m, s] = value as number[]
    const abs = Math.abs(d) + m / 60 + s / 3600
    return ref === 'S' || ref === 'W' ? -abs : abs
  }
  return undefined
}

/**
 * EXIF 标签分类：拍摄参数 / GPS / 其他。
 * GPS 同时展示十进制与度分秒两种格式；海拔单独一行。
 */
export function categorizeTags(data: Record<string, unknown>): CategorizedTags {
  const shooting: ExifRow[] = []
  for (const [rawKey, id] of SHOOTING_KEYS) {
    const v = data[rawKey]
    if (hasValue(v)) shooting.push({ key: id, value: formatShootingValue(rawKey, v) })
  }

  const gps: ExifRow[] = []
  const lat = toDecimalDegrees(data['GPSLatitude'] ?? data['latitude'], data['GPSLatitudeRef'])
  const lon = toDecimalDegrees(data['GPSLongitude'] ?? data['longitude'], data['GPSLongitudeRef'])
  if (lat !== undefined) {
    gps.push({ key: 'gpsLat', value: `${formatLatitude(lat)} (${decimalToDms(lat, 'lat')})` })
  }
  if (lon !== undefined) {
    gps.push({ key: 'gpsLon', value: `${formatLongitude(lon)} (${decimalToDms(lon, 'lon')})` })
  }
  const alt = data['GPSAltitude']
  if (typeof alt === 'number' && Number.isFinite(alt)) {
    gps.push({ key: 'gpsAlt', value: `${trimNumber(alt)} m` })
  }

  const others: ExifRow[] = []
  for (const rawKey of Object.keys(data)) {
    if (SHOOTING_RAW_KEYS.has(rawKey) || GPS_RAW_KEYS.has(rawKey)) continue
    const v = data[rawKey]
    if (hasValue(v)) others.push({ key: rawKey, value: stringifyTagValue(v) })
  }

  return { shooting, gps, others }
}

export interface FileInfoInput {
  name: string
  size: number
  mime: string
  width: number
  height: number
}

/** 文件信息行：文件名 / 大小 / MIME / 尺寸 */
export function buildFileRows(info: FileInfoInput): ExifRow[] {
  return [
    { key: 'fileName', value: info.name === '' ? '—' : info.name },
    { key: 'fileSize', value: formatBytes(info.size) },
    { key: 'mimeType', value: info.mime === '' ? '—' : info.mime },
    { key: 'dimensions', value: `${info.width} × ${info.height}` },
  ]
}
