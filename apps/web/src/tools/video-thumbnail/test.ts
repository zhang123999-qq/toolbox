import { describe, expect, it } from 'vitest'
import {
  MAX_COLUMNS,
  MAX_TIMESTAMPS,
  formatBytes,
  formatSeconds,
  gridDims,
  parseTimestamps,
  thumbnailFileName,
  validateTimestamps,
} from './utils'

describe('video-thumbnail / 时间点解析', () => {
  it('多种分隔符都能解析', () => {
    expect(parseTimestamps('0.5,1,2')).toEqual([0.5, 1, 2])
    expect(parseTimestamps('0.5，1，2')).toEqual([0.5, 1, 2])
    expect(parseTimestamps('0.5、1、2')).toEqual([0.5, 1, 2])
    expect(parseTimestamps('0.5 1\n2')).toEqual([0.5, 1, 2])
    expect(parseTimestamps('  1 ,, 2  ')).toEqual([1, 2])
  })

  it('空输入抛中文错', () => {
    for (const bad of ['', '   ', ',\n，']) {
      expect(() => parseTimestamps(bad)).toThrow(/请输入至少一个时间点/)
    }
  })

  it('非数字 token 抛中文错并指出位置', () => {
    expect(() => parseTimestamps('1,abc,2')).toThrow(/时间点非法：“abc”不是数字/)
    expect(() => parseTimestamps('NaN')).toThrow(/时间点非法/)
  })
})

describe('video-thumbnail / 时间点校验', () => {
  it('合法时间点通过', () => {
    expect(() => validateTimestamps([0, 1.5, 10], 10)).not.toThrow()
    expect(() => validateTimestamps([10], 10)).not.toThrow()
  })

  it('视频时长非法抛中文错', () => {
    for (const bad of [Number.NaN, 0, -3, Number.POSITIVE_INFINITY]) {
      expect(() => validateTimestamps([1], bad)).toThrow(/视频时长非法/)
    }
  })

  it('空数组与超量抛中文错', () => {
    expect(() => validateTimestamps([], 10)).toThrow(/请输入至少一个时间点/)
    expect(() => validateTimestamps(new Array(MAX_TIMESTAMPS + 1).fill(1), 10)).toThrow(
      /时间点过多/,
    )
    expect(() => validateTimestamps(new Array(MAX_TIMESTAMPS).fill(1), 10)).not.toThrow()
  })

  it('越界时间点抛中文错并指出序号', () => {
    expect(() => validateTimestamps([5, -1], 10)).toThrow(/第 2 个时间点/)
    expect(() => validateTimestamps([11], 10)).toThrow(/超出视频时长/)
    expect(() => validateTimestamps([Number.NaN], 10)).toThrow(/第 1 个时间点不是有效数字/)
  })
})

describe('video-thumbnail / 网格布局', () => {
  it('行列计算正确', () => {
    expect(gridDims(6, 3)).toEqual({ rows: 2, cols: 3 })
    expect(gridDims(5, 3)).toEqual({ rows: 2, cols: 3 })
    expect(gridDims(2, 4)).toEqual({ rows: 1, cols: 2 })
    expect(gridDims(1, 1)).toEqual({ rows: 1, cols: 1 })
    expect(gridDims(7, MAX_COLUMNS)).toEqual({ rows: 2, cols: MAX_COLUMNS })
  })

  it('非法数量 / 列数抛中文错', () => {
    expect(() => gridDims(0, 3)).toThrow(/缩略图数量非法/)
    expect(() => gridDims(1.5, 3)).toThrow(/缩略图数量非法/)
    expect(() => gridDims(Number.NaN, 3)).toThrow(/缩略图数量非法/)
    expect(() => gridDims(3, 0)).toThrow(/列数非法/)
    expect(() => gridDims(3, MAX_COLUMNS + 1)).toThrow(/列数非法/)
    expect(() => gridDims(3, 2.5)).toThrow(/列数非法/)
  })
})

describe('video-thumbnail / 文件名与格式化', () => {
  it('缩略图文件名带序号', () => {
    expect(thumbnailFileName('movie.mp4', 0)).toBe('movie-thumb-1.png')
    expect(thumbnailFileName('a.b.c.webm', 9)).toBe('a.b.c-thumb-10.png')
    expect(thumbnailFileName('noext', 2)).toBe('noext-thumb-3.png')
    expect(thumbnailFileName('.mp4', 0)).toBe('video-thumb-1.png')
  })

  it('formatSeconds / formatBytes', () => {
    expect(formatSeconds(1.236)).toBe('1.24 秒')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})
