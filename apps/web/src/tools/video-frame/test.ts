import { describe, expect, it } from 'vitest'
import {
  MAX_EXPORT_DIM,
  buildFilename,
  clampTime,
  fitSize,
  formatTime,
  parseTimeInput,
  secondsToSlider,
  sliderToSeconds,
  validateTime,
} from './utils'

describe('video-frame / 时间校验', () => {
  it('合法时间通过并原样返回', () => {
    expect(validateTime(10.5, 120)).toBe(10.5)
    expect(validateTime(0, 60)).toBe(0)
    expect(validateTime(60, 60)).toBe(60)
  })

  it('负数/非有限数抛中文错', () => {
    expect(() => validateTime(-1, 60)).toThrow(/时间非法/)
    expect(() => validateTime(Number.NaN, 60)).toThrow(/时间非法/)
  })

  it('超过时长抛中文错', () => {
    expect(() => validateTime(61, 60)).toThrow(/超过视频时长/)
  })

  it('时长无效抛中文错', () => {
    expect(() => validateTime(1, 0)).toThrow(/视频时长无效/)
    expect(() => validateTime(1, -5)).toThrow(/视频时长无效/)
    expect(() => validateTime(1, Number.NaN)).toThrow(/视频时长无效/)
  })
})

describe('video-frame / 时间钳制', () => {
  it('钳制到 [0, duration-1ms]', () => {
    expect(clampTime(10, 60)).toBe(10)
    expect(clampTime(-5, 60)).toBe(0)
    expect(clampTime(100, 60)).toBeCloseTo(59.999, 3)
    expect(clampTime(60, 60)).toBeCloseTo(59.999, 3)
    expect(clampTime(Number.NaN, 60)).toBe(0)
  })

  it('时长无效返回 0', () => {
    expect(clampTime(10, 0)).toBe(0)
    expect(clampTime(10, -1)).toBe(0)
    expect(clampTime(10, Number.NaN)).toBe(0)
  })
})

describe('video-frame / 时间格式化', () => {
  it('秒 → mm:ss.mmm', () => {
    expect(formatTime(0)).toBe('00:00.000')
    expect(formatTime(90.5)).toBe('01:30.500')
    expect(formatTime(5.25)).toBe('00:05.250')
    expect(formatTime(3661.25)).toBe('61:01.250')
  })

  it('毫秒四舍五入进位', () => {
    expect(formatTime(1.9999)).toBe('00:02.000')
  })

  it('非法秒数抛中文错', () => {
    expect(() => formatTime(-1)).toThrow(/秒数非法/)
    expect(() => formatTime(Number.NaN)).toThrow(/秒数非法/)
    expect(() => formatTime(Number.POSITIVE_INFINITY)).toThrow(/秒数非法/)
  })
})

describe('video-frame / 时间解析', () => {
  it('纯秒解析', () => {
    expect(parseTimeInput('90.5')).toBe(90.5)
    expect(parseTimeInput('0')).toBe(0)
    expect(parseTimeInput('  10  ')).toBe(10)
  })

  it('分:秒解析', () => {
    expect(parseTimeInput('1:30')).toBe(90)
    expect(parseTimeInput('1:30.5')).toBe(90.5)
    expect(parseTimeInput('01:05.250')).toBe(65.25)
  })

  it('分:秒超出 24 小时抛中文错', () => {
    expect(() => parseTimeInput('99999:59')).toThrow(/时间非法/)
  })

  it('非法输入抛中文错', () => {
    for (const bad of ['', '   ', 'abc', '-5', '1:2:3', '1:75', '1:30.1234', '999999999']) {
      expect(() => parseTimeInput(bad)).toThrow(/请输入时间|时间非法/)
    }
  })
})

describe('video-frame / 文件名', () => {
  it('原名 + 时间戳拼 PNG 文件名', () => {
    expect(buildFilename('movie.mp4', 90.5)).toBe('movie_frame_01-30-500.png')
    expect(buildFilename('无后缀', 0)).toBe('无后缀_frame_00-00-000.png')
  })

  it('特殊字符被替换', () => {
    expect(buildFilename('my movie (2024).mp4', 5)).toBe('my_movie__2024__frame_00-05-000.png')
  })

  it('超长名截断', () => {
    const name = 'a'.repeat(200) + '.mp4'
    const out = buildFilename(name, 1)
    expect(out.length).toBeLessThan(200)
    expect(out.endsWith('.png')).toBe(true)
  })

  it('空名回退为 video', () => {
    expect(buildFilename('', 1)).toBe('video_frame_00-01-000.png')
  })

  it('非法秒数抛中文错', () => {
    expect(() => buildFilename('a.mp4', -1)).toThrow(/秒数非法/)
    expect(() => buildFilename('a.mp4', Number.NaN)).toThrow(/秒数非法/)
  })
})

describe('video-frame / 导出尺寸', () => {
  it('未超限原样返回', () => {
    expect(fitSize(640, 360)).toEqual({ width: 640, height: 360 })
    expect(fitSize(MAX_EXPORT_DIM, 1080)).toEqual({ width: MAX_EXPORT_DIM, height: 1080 })
  })

  it('超限按长边等比缩放', () => {
    const s = fitSize(4000, 3000)
    expect(s.width).toBe(1920)
    expect(s.height).toBe(1440)
    const v = fitSize(3000, 4000)
    expect(v).toEqual({ width: 1440, height: 1920 })
  })

  it('非法尺寸抛中文错', () => {
    for (const [w, h] of [
      [0, 100],
      [-1, 100],
      [100, 0],
      [Number.NaN, 100],
    ] as const) {
      expect(() => fitSize(w, h)).toThrow(/视频尺寸无效/)
    }
  })

  it('最大边长参数非法抛中文错', () => {
    expect(() => fitSize(100, 100, 0)).toThrow(/最大边长非法/)
    expect(() => fitSize(100, 100, 1.5)).toThrow(/最大边长非法/)
  })
})

describe('video-frame / 滑杆换算', () => {
  it('滑杆值 ↔ 秒双向换算', () => {
    expect(sliderToSeconds(500, 120)).toBe(60)
    expect(sliderToSeconds(-10, 120)).toBe(0)
    expect(sliderToSeconds(2000, 120)).toBe(120)
    expect(secondsToSlider(60, 120)).toBe(500)
    expect(secondsToSlider(120, 120)).toBe(1000)
    expect(secondsToSlider(-5, 120)).toBe(0)
  })

  it('非法值抛中文错', () => {
    expect(() => sliderToSeconds(Number.NaN, 120)).toThrow(/滑杆值非法/)
    expect(() => secondsToSlider(10, 0)).toThrow(/时长无效/)
    expect(() => secondsToSlider(Number.NaN, 120)).toThrow(/时长无效/)
  })
})
