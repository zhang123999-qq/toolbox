import { describe, expect, it } from 'vitest'
import {
  SRT_TARGETS,
  convertSrt,
  cuesToJson,
  cuesToText,
  formatSrtTimestamp,
  formatVttTimestamp,
  parseSrt,
  parseTimestamp,
  serializeSrt,
  serializeVtt,
  shiftCues,
  validateSrtTarget,
} from './utils'
import type { SubtitleCue } from './utils'

const SAMPLE = `1
00:00:01,000 --> 00:00:04,000
你好，世界

2
00:00:05,500 --> 00:00:08,000
第二行
多行文本
`

describe('srt-convert / 时间戳', () => {
  it('逗号与点号两种毫秒分隔符都识别', () => {
    expect(parseTimestamp('00:00:01,000')).toBe(1000)
    expect(parseTimestamp('00:00:01.000')).toBe(1000)
    expect(parseTimestamp('01:02:03,456')).toBe(3723456)
    expect(parseTimestamp('01:02:03.456')).toBe(3723456)
  })

  it('毫秒 1–2 位自动补齐', () => {
    expect(parseTimestamp('00:00:01,5')).toBe(1500)
    expect(parseTimestamp('00:00:01.25')).toBe(1250)
  })

  it('VTT 短式 MM:SS.mmm', () => {
    expect(parseTimestamp('02:03.456')).toBe(123456)
  })

  it('非法时间戳抛中文错', () => {
    for (const bad of [
      'abc',
      '00:00:01',
      '00:00',
      '',
      '00:70:00,000',
      '00:00:70.000',
      '1:2:3,4567',
    ]) {
      expect(() => parseTimestamp(bad)).toThrow(/时间戳非法/)
    }
    expect(() => parseTimestamp('   ')).toThrow(/（空）/)
  })

  it('格式化：SRT 用逗号，VTT 用点号', () => {
    expect(formatSrtTimestamp(3723456)).toBe('01:02:03,456')
    expect(formatVttTimestamp(3723456)).toBe('01:02:03.456')
    expect(formatSrtTimestamp(0)).toBe('00:00:00,000')
  })

  it('毫秒数非法抛中文错', () => {
    expect(() => formatSrtTimestamp(-1)).toThrow(/毫秒数非法/)
    expect(() => formatVttTimestamp(Number.NaN)).toThrow(/毫秒数非法/)
  })
})

describe('srt-convert / 解析', () => {
  it('解析出条目：时间与多行文本正确', () => {
    const cues = parseSrt(SAMPLE)
    expect(cues.length).toBe(2)
    expect(cues[0]).toEqual({ start: 1000, end: 4000, text: '你好，世界' })
    expect(cues[1]).toEqual({ start: 5500, end: 8000, text: '第二行\n多行文本' })
  })

  it('容忍 CRLF 与无序号块', () => {
    const cues = parseSrt(
      '00:00:01,000 --> 00:00:02,000\r\nhello\r\n\r\n3\r\n00:00:03,000 --> 00:00:04,000\r\nworld\r\n',
    )
    expect(cues.length).toBe(2)
    expect(cues[0]!.text).toBe('hello')
    expect(cues[1]!.text).toBe('world')
  })

  it('空输入解析为空数组', () => {
    expect(parseSrt('')).toEqual([])
    expect(parseSrt('   \n\n  ')).toEqual([])
  })

  it('缺少时间轴的行块抛中文错', () => {
    expect(() => parseSrt('1\n这不是时间轴\n')).toThrow(/缺少时间轴/)
  })

  it('时间轴残缺抛中文错', () => {
    expect(() => parseSrt('1\n00:00:01,000 -->\n文本\n')).toThrow(/时间轴格式非法/)
    expect(() => parseSrt('1\n--> 00:00:02,000\n文本\n')).toThrow(/时间轴格式非法/)
  })

  it('非法时间戳 / 结束早于开始抛中文错', () => {
    expect(() => parseSrt('1\nxx --> 00:00:02,000\n文本\n')).toThrow(/时间戳非法/)
    expect(() => parseSrt('1\n00:00:05,000 --> 00:00:02,000\n文本\n')).toThrow(
      /结束时间早于开始时间/,
    )
  })
})

describe('srt-convert / 序列化', () => {
  const cues: SubtitleCue[] = [
    { start: 1000, end: 4000, text: '你好' },
    { start: 5500, end: 8000, text: '世界' },
  ]

  it('serializeSrt：序号 + 逗号时间戳', () => {
    expect(serializeSrt(cues)).toBe(
      '1\n00:00:01,000 --> 00:00:04,000\n你好\n\n2\n00:00:05,500 --> 00:00:08,000\n世界\n',
    )
  })

  it('serializeVtt：带 WEBVTT 文件头，点号时间戳', () => {
    const out = serializeVtt(cues)
    expect(out.startsWith('WEBVTT\n\n')).toBe(true)
    expect(out).toContain('00:00:01.000 --> 00:00:04.000')
  })

  it('cuesToText / cuesToJson', () => {
    expect(cuesToText(cues)).toBe('你好\n世界')
    expect(JSON.parse(cuesToJson(cues))).toEqual([
      { start: 1000, end: 4000, text: '你好' },
      { start: 5500, end: 8000, text: '世界' },
    ])
  })

  it('往返：解析 → 序列化还原', () => {
    expect(serializeSrt(parseSrt(SAMPLE))).toBe(SAMPLE)
  })

  it('目标格式白名单校验', () => {
    expect(() => validateSrtTarget('vtt')).not.toThrow()
    expect(() => validateSrtTarget('ass')).toThrow(/目标格式非法/)
    expect(SRT_TARGETS).toContain('json')
  })
})

describe('srt-convert / 时间轴偏移', () => {
  const cues: SubtitleCue[] = [
    { start: 1000, end: 4000, text: 'a' },
    { start: 5000, end: 6000, text: 'b' },
  ]

  it('正偏移整体后移', () => {
    const out = shiftCues(cues, 2000)
    expect(out[0]).toEqual({ start: 3000, end: 6000, text: 'a' })
    expect(out[1]).toEqual({ start: 7000, end: 8000, text: 'b' })
  })

  it('负偏移钳制到 0，不修改原数组', () => {
    const out = shiftCues(cues, -1500)
    expect(out[0]).toEqual({ start: 0, end: 2500, text: 'a' })
    expect(cues[0]!.start).toBe(1000)
  })

  it('偏移后时长 ≤ 0 的条目被丢弃', () => {
    const out = shiftCues(cues, -10000)
    expect(out).toEqual([])
  })

  it('偏移量非数字抛中文错', () => {
    expect(() => shiftCues(cues, Number.NaN)).toThrow(/偏移量非法/)
  })
})

describe('srt-convert / 一站式转换', () => {
  it('SRT → VTT / 纯文本 / JSON', () => {
    const vtt = convertSrt(SAMPLE, 'vtt', 0)
    expect(vtt.startsWith('WEBVTT')).toBe(true)
    expect(vtt).toContain('00:00:05.500 --> 00:00:08.000')
    expect(convertSrt(SAMPLE, 'txt', 0)).toBe('你好，世界\n第二行\n多行文本')
    expect(JSON.parse(convertSrt(SAMPLE, 'json', 0)).length).toBe(2)
  })

  it('SRT → SRT 带偏移', () => {
    const out = convertSrt(SAMPLE, 'srt', 1000)
    expect(out).toContain('00:00:02,000 --> 00:00:05,000')
  })

  it('空字幕抛中文错', () => {
    expect(() => convertSrt('', 'vtt', 0)).toThrow(/字幕为空/)
    expect(() => convertSrt('   ', 'txt', 0)).toThrow(/字幕为空/)
  })

  it('偏移量非法透出中文错', () => {
    expect(() => convertSrt(SAMPLE, 'vtt', Number.NaN)).toThrow(/偏移量非法/)
  })
})
