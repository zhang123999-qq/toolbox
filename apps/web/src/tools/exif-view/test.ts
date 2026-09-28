import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  NO_EXIF_MESSAGE,
  assertExifFound,
  assertFileSizeOk,
  buildFileRows,
  categorizeTags,
  decimalToDms,
  errorMessage,
  formatAperture,
  formatDateTime,
  formatExposureTime,
  formatFlash,
  formatFocalLength,
  formatGps,
  stringifyTagValue,
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

describe('assertExifFound', () => {
  it('空/undefined/空对象抛"未找到 EXIF 信息"', () => {
    expect(() => assertExifFound(undefined)).toThrow(NO_EXIF_MESSAGE)
    expect(() => assertExifFound(null)).toThrow(NO_EXIF_MESSAGE)
    expect(() => assertExifFound({})).toThrow(NO_EXIF_MESSAGE)
    expect(() => assertExifFound('not-object')).toThrow(NO_EXIF_MESSAGE)
    expect(() => assertExifFound(42)).toThrow(NO_EXIF_MESSAGE)
  })

  it('有键的对象通过', () => {
    expect(() => assertExifFound({ Make: 'Canon' })).not.toThrow()
  })
})

describe('formatGps', () => {
  it('十进制组合：正数 N/E', () => {
    expect(formatGps(39.9042, 116.4074)).toBe('39.9042°N, 116.4074°E')
  })

  it('负数 S/W', () => {
    expect(formatGps(-39.9, -116.4)).toBe('39.9000°S, 116.4000°W')
  })

  it('非法返回占位', () => {
    expect(formatGps(NaN, 1)).toBe('—')
    expect(formatGps(1, Infinity)).toBe('—')
    expect(formatGps('39.9', 116.4)).toBe('—')
    expect(formatGps(39.9, 'x')).toBe('—')
    expect(formatGps(undefined, undefined)).toBe('—')
  })
})

describe('decimalToDms', () => {
  it('十进制转度分秒', () => {
    expect(decimalToDms(39.9042, 'lat')).toBe('39°54′15.1″N')
    expect(decimalToDms(-116.4074, 'lon')).toBe('116°24′26.6″W')
  })

  it('零点与正负后缀', () => {
    expect(decimalToDms(0, 'lat')).toBe('0°0′0.0″N')
    expect(decimalToDms(-0.5, 'lat')).toBe('0°30′0.0″S')
    expect(decimalToDms(120.5, 'lon')).toBe('120°30′0.0″E')
  })

  it('非法返回占位', () => {
    expect(decimalToDms(NaN, 'lat')).toBe('—')
    expect(decimalToDms('39.9', 'lat')).toBe('—')
    expect(decimalToDms(undefined, 'lon')).toBe('—')
  })
})

describe('formatExposureTime', () => {
  it('分数快门', () => {
    expect(formatExposureTime(0.004)).toBe('1/250 s')
    expect(formatExposureTime(1 / 60)).toBe('1/60 s')
    expect(formatExposureTime(0.5)).toBe('1/2 s')
  })

  it('≥1 秒直接显示秒数', () => {
    expect(formatExposureTime(2)).toBe('2 s')
    expect(formatExposureTime(1.5)).toBe('1.5 s')
  })

  it('非法返回占位', () => {
    expect(formatExposureTime(0)).toBe('—')
    expect(formatExposureTime(-1)).toBe('—')
    expect(formatExposureTime(NaN)).toBe('—')
    expect(formatExposureTime(Infinity)).toBe('—')
    expect(formatExposureTime('1/250')).toBe('—')
  })
})

describe('formatAperture', () => {
  it('f/ 前缀', () => {
    expect(formatAperture(2.8)).toBe('f/2.8')
    expect(formatAperture(16)).toBe('f/16')
  })

  it('浮点噪声被修整', () => {
    expect(formatAperture(2.7999999)).toBe('f/2.8')
  })

  it('非法返回占位', () => {
    expect(formatAperture(0)).toBe('—')
    expect(formatAperture(-2.8)).toBe('—')
    expect(formatAperture(NaN)).toBe('—')
    expect(formatAperture('f/2.8')).toBe('—')
  })
})

describe('formatFocalLength', () => {
  it('mm 后缀', () => {
    expect(formatFocalLength(50)).toBe('50 mm')
    expect(formatFocalLength(24.5)).toBe('24.5 mm')
  })

  it('非法返回占位', () => {
    expect(formatFocalLength(0)).toBe('—')
    expect(formatFocalLength(NaN)).toBe('—')
    expect(formatFocalLength('50')).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('Date 格式化为本地时间串', () => {
    expect(formatDateTime(new Date(2024, 4, 1, 12, 30, 5))).toBe('2024-05-01 12:30:05')
    expect(formatDateTime(new Date(2024, 0, 9, 3, 4, 7))).toBe('2024-01-09 03:04:07')
  })

  it('字符串原样返回', () => {
    expect(formatDateTime('2024:05:01 12:30:00')).toBe('2024:05:01 12:30:00')
  })

  it('非法返回占位', () => {
    expect(formatDateTime(new Date(NaN))).toBe('—')
    expect(formatDateTime(123)).toBe('—')
    expect(formatDateTime(null)).toBe('—')
  })
})

describe('stringifyTagValue', () => {
  it('空值占位', () => {
    expect(stringifyTagValue(null)).toBe('—')
    expect(stringifyTagValue(undefined)).toBe('—')
  })

  it('Date 格式化', () => {
    expect(stringifyTagValue(new Date(2024, 4, 1, 12, 30, 0))).toBe('2024-05-01 12:30:00')
  })

  it('数组逗号连接（支持嵌套）', () => {
    expect(stringifyTagValue([1, 2, 3])).toBe('1, 2, 3')
    expect(stringifyTagValue([1, [2, 3]])).toBe('1, 2, 3')
  })

  it('其他转字符串', () => {
    expect(stringifyTagValue('Canon')).toBe('Canon')
    expect(stringifyTagValue(100)).toBe('100')
    expect(stringifyTagValue(true)).toBe('true')
  })
})

describe('formatFlash', () => {
  it('常见编码转中文', () => {
    expect(formatFlash(0)).toBe('未闪光')
    expect(formatFlash(1)).toBe('闪光')
    expect(formatFlash(9)).toBe('闪光（强制开启）')
    expect(formatFlash(25)).toBe('闪光（自动）')
  })

  it('未知编码回退原始值', () => {
    expect(formatFlash(5)).toBe('5')
    expect(formatFlash('fired')).toBe('fired')
  })
})

const FULL_EXIF: Record<string, unknown> = {
  Make: 'Canon',
  Model: 'EOS R5',
  FNumber: 2.8,
  ExposureTime: 0.004,
  ISO: 100,
  FocalLength: 50,
  DateTimeOriginal: new Date(2024, 4, 1, 12, 30, 0),
  Flash: 0,
  ExposureProgram: 3,
  GPSLatitude: 39.9042,
  GPSLongitude: 116.4074,
  GPSLatitudeRef: 'N',
  GPSLongitudeRef: 'E',
  GPSAltitude: 42,
  ExifVersion: '0232',
  ColorSpace: 1,
}

describe('categorizeTags', () => {
  it('完整数据分类正确，拍摄参数按顺序格式化', () => {
    const { shooting } = categorizeTags(FULL_EXIF)
    expect(shooting.map((r) => r.key)).toEqual([
      'make',
      'model',
      'fNumber',
      'exposureTime',
      'iso',
      'focalLength',
      'dateTimeOriginal',
      'flash',
      'exposureProgram',
    ])
    const byId = Object.fromEntries(shooting.map((r) => [r.key, r.value]))
    expect(byId.make).toBe('Canon')
    expect(byId.model).toBe('EOS R5')
    expect(byId.fNumber).toBe('f/2.8')
    expect(byId.exposureTime).toBe('1/250 s')
    expect(byId.iso).toBe('100')
    expect(byId.focalLength).toBe('50 mm')
    expect(byId.dateTimeOriginal).toBe('2024-05-01 12:30:00')
    expect(byId.flash).toBe('未闪光')
    expect(byId.exposureProgram).toBe('3')
  })

  it('GPS 行同时展示十进制与度分秒', () => {
    const { gps } = categorizeTags(FULL_EXIF)
    expect(gps).toEqual([
      { key: 'gpsLat', value: '39.9042°N (39°54′15.1″N)' },
      { key: 'gpsLon', value: '116.4074°E (116°24′26.6″E)' },
      { key: 'gpsAlt', value: '42 m' },
    ])
  })

  it('其他标签保留原始键名', () => {
    const { others } = categorizeTags(FULL_EXIF)
    expect(others).toEqual([
      { key: 'ExifVersion', value: '0232' },
      { key: 'ColorSpace', value: '1' },
    ])
  })

  it('空值标签被跳过', () => {
    const { shooting, others } = categorizeTags({
      Make: '',
      Model: null,
      ISO: undefined,
      ExifVersion: '',
      ColorSpace: 1,
    })
    expect(shooting).toEqual([])
    expect(others).toEqual([{ key: 'ColorSpace', value: '1' }])
  })

  it('无 GPS 数据时 gps 为空', () => {
    const { gps } = categorizeTags({ Make: 'Canon', ExifVersion: '0232' })
    expect(gps).toEqual([])
  })

  it('GPS [度,分,秒] 数组按 Ref 决定符号', () => {
    const { gps } = categorizeTags({
      GPSLatitude: [39, 54, 15.12],
      GPSLatitudeRef: 'S',
      GPSLongitude: [116, 24, 26.64],
      GPSLongitudeRef: 'W',
    })
    expect(gps[0].value).toBe('39.9042°S (39°54′15.1″S)')
    expect(gps[1].value).toBe('116.4074°W (116°24′26.6″W)')
  })

  it('GPS 数组 Ref 为 N/E 或缺省时取正值', () => {
    const { gps } = categorizeTags({
      GPSLatitude: [39, 54, 15.12],
      GPSLatitudeRef: 'N',
      GPSLongitude: [116, 24, 26.64],
    })
    expect(gps[0].value).toBe('39.9042°N (39°54′15.1″N)')
    expect(gps[1].value).toBe('116.4074°E (116°24′26.6″E)')
  })

  it('GPS 数组含非法元素时跳过该行', () => {
    expect(categorizeTags({ GPSLatitude: [39, 54, 'x'] }).gps).toEqual([])
    expect(categorizeTags({ GPSLatitude: [39, 54, NaN] }).gps).toEqual([])
    expect(categorizeTags({ GPSLatitude: [39, 'x'] }).gps).toEqual([])
    expect(categorizeTags({ GPSLongitude: 'bad' }).gps).toEqual([])
  })

  it('latitude/longitude 顶层键作为回退', () => {
    const { gps } = categorizeTags({ latitude: 39.9042, longitude: 116.4074 })
    expect(gps.map((r) => r.key)).toEqual(['gpsLat', 'gpsLon'])
    // 回退键不进入其他标签
    const { others } = categorizeTags({ latitude: 39.9042, longitude: 116.4074 })
    expect(others).toEqual([])
  })

  it('只有纬度时只展示纬度行', () => {
    const { gps } = categorizeTags({ GPSLatitude: 39.9042 })
    expect(gps.map((r) => r.key)).toEqual(['gpsLat'])
  })

  it('海拔非数字时跳过', () => {
    const { gps } = categorizeTags({ GPSLatitude: 1, GPSLongitude: 2, GPSAltitude: 'high' })
    expect(gps.map((r) => r.key)).toEqual(['gpsLat', 'gpsLon'])
  })
})

describe('buildFileRows', () => {
  it('四行文件信息', () => {
    expect(
      buildFileRows({
        name: 'photo.jpg',
        size: 123456,
        mime: 'image/jpeg',
        width: 800,
        height: 600,
      }),
    ).toEqual([
      { key: 'fileName', value: 'photo.jpg' },
      { key: 'fileSize', value: '121 KB' },
      { key: 'mimeType', value: 'image/jpeg' },
      { key: 'dimensions', value: '800 × 600' },
    ])
  })

  it('空名/空 MIME 显示占位', () => {
    const rows = buildFileRows({ name: '', size: 0, mime: '', width: 1, height: 1 })
    expect(rows[0].value).toBe('—')
    expect(rows[1].value).toBe('0 B')
    expect(rows[2].value).toBe('—')
  })
})
