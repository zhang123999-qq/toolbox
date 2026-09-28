import { describe, expect, it } from 'vitest'
import {
  buildCutArgs,
  cutFileName,
  formatBytes,
  formatSeconds,
  formatTimeForFfmpeg,
  parseTimeInput,
  validateCutRange,
} from './utils'

describe('video-cut / 时间解析', () => {
  it('纯秒数与带小数的写法', () => {
    expect(parseTimeInput('83.5')).toBe(83.5)
    expect(parseTimeInput('0')).toBe(0)
    expect(parseTimeInput('  12 ')).toBe(12)
  })

  it('分:秒 / 时:分:秒写法', () => {
    expect(parseTimeInput('1:23.5')).toBe(83.5)
    expect(parseTimeInput('1:02:03')).toBe(3723)
    expect(parseTimeInput('0:00')).toBe(0)
  })

  it('非法输入抛中文错', () => {
    expect(() => parseTimeInput('')).toThrow(/时间不能为空/)
    expect(() => parseTimeInput('   ')).toThrow(/时间不能为空/)
    expect(() => parseTimeInput('abc')).toThrow(/时间格式非法/)
    expect(() => parseTimeInput('-5')).toThrow(/时间格式非法/)
    expect(() => parseTimeInput('1:2:3:4')).toThrow(/时间格式非法/)
    expect(() => parseTimeInput('1::3')).toThrow(/存在空的分量/)
    expect(() => parseTimeInput('1:2.5:3')).toThrow(/分、时必须为整数/)
    expect(() => parseTimeInput('NaN')).toThrow(/时间格式非法/)
    expect(() => parseTimeInput('Infinity')).toThrow(/时间格式非法/)
  })
})

describe('video-cut / 时间格式化', () => {
  it('秒数转 ffmpeg 时间戳 HH:MM:SS.mmm', () => {
    expect(formatTimeForFfmpeg(0)).toBe('00:00:00.000')
    expect(formatTimeForFfmpeg(83.5)).toBe('00:01:23.500')
    expect(formatTimeForFfmpeg(3723.456)).toBe('01:02:03.456')
  })

  it('非法秒数抛中文错', () => {
    expect(() => formatTimeForFfmpeg(-1)).toThrow(/时间非法/)
    expect(() => formatTimeForFfmpeg(Number.NaN)).toThrow(/时间非法/)
  })

  it('formatSeconds / formatBytes', () => {
    expect(formatSeconds(1.234)).toBe('1.23 秒')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MiB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})

describe('video-cut / 裁剪范围校验', () => {
  it('合法范围通过', () => {
    expect(() => validateCutRange(1, 2, 4)).not.toThrow()
    expect(() => validateCutRange(1, 2, null)).not.toThrow()
  })

  it('非法范围抛中文错', () => {
    expect(() => validateCutRange(Number.NaN, 2, 4)).toThrow(/有效数字/)
    expect(() => validateCutRange(1, Number.NaN, 4)).toThrow(/有效数字/)
    expect(() => validateCutRange(-1, 2, 4)).toThrow(/不能为负数/)
    expect(() => validateCutRange(1, -2, 4)).toThrow(/不能为负数/)
    expect(() => validateCutRange(2, 2, 4)).toThrow(/必须小于结束时间/)
    expect(() => validateCutRange(3, 2, 4)).toThrow(/必须小于结束时间/)
    expect(() => validateCutRange(1, 5, 4)).toThrow(/超出视频时长/)
    expect(() => validateCutRange(1, 5, null)).not.toThrow()
  })
})

describe('video-cut / ffmpeg 参数拼装', () => {
  it('重编码模式拼出 H.264 + AAC 参数', () => {
    const args = buildCutArgs('00:00:01.000', '00:00:02.000', 'in', 'out.mp4', true)
    expect(args).toEqual([
      '-ss',
      '00:00:01.000',
      '-to',
      '00:00:02.000',
      '-i',
      'in',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-c:a',
      'aac',
      'out.mp4',
    ])
  })

  it('流拷贝模式用 -c copy', () => {
    const args = buildCutArgs('00:00:01.000', '00:00:02.000', 'in', 'out.mp4', false)
    expect(args).toEqual([
      '-ss',
      '00:00:01.000',
      '-to',
      '00:00:02.000',
      '-i',
      'in',
      '-c',
      'copy',
      'out.mp4',
    ])
  })
})

describe('video-cut / 文件名', () => {
  it('原名去扩展名后加 -cut.mp4', () => {
    expect(cutFileName('clip.mov')).toBe('clip-cut.mp4')
    expect(cutFileName('a.b.c.webm')).toBe('a.b.c-cut.mp4')
    expect(cutFileName('noext')).toBe('noext-cut.mp4')
    expect(cutFileName('.mp4')).toBe('video-cut.mp4')
  })
})
