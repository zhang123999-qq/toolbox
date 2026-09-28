import { describe, expect, it } from 'vitest'
import {
  VTT_TARGETS,
  convertVtt,
  cuesToJson,
  cuesToText,
  formatSrtTimestamp,
  formatVttTimestamp,
  parseTimestamp,
  parseVtt,
  serializeSrt,
  serializeVtt,
  shiftCues,
  validateVttTarget,
} from './utils'
import type { SubtitleCue } from './utils'

const SAMPLE = `WEBVTT

NOTE 这是注释，会被跳过

STYLE
::cue { color: #fff }

REGION
id:fred

cue-1
00:00:01.000 --> 00:00:04.000 position:10%,line-left
你好，世界

00:00:05.500 --> 00:00:08.000
第二行
`

describe('vtt-convert / 时间戳', () => {
  it('点号与逗号分隔符都识别，短式 MM:SS.mmm 兼容', () => {
    expect(parseTimestamp('00:00:01.000')).toBe(1000)
    expect(parseTimestamp('00:00:01,000')).toBe(1000)
    expect(parseTimestamp('02:03.456')).toBe(123456)
    expect(parseTimestamp('01:02:03.5')).toBe(3723500)
  })

  it('非法时间戳抛中文错', () => {
    for (const bad of ['abc', '', '00:70:00.000', '00:00:70,000']) {
      expect(() => parseTimestamp(bad)).toThrow(/时间戳非法/)
    }
    expect(() => parseTimestamp('   ')).toThrow(/（空）/)
  })

  it('格式化与非法毫秒', () => {
    expect(formatVttTimestamp(3723456)).toBe('01:02:03.456')
    expect(formatSrtTimestamp(3723456)).toBe('01:02:03,456')
    expect(() => formatVttTimestamp(-1)).toThrow(/毫秒数非法/)
    expect(() => formatSrtTimestamp(Number.NaN)).toThrow(/毫秒数非法/)
  })
})

describe('vtt-convert / 解析', () => {
  it('解析出条目：跳过 NOTE / STYLE / REGION 块与 cue 标识符', () => {
    const cues = parseVtt(SAMPLE)
    expect(cues.length).toBe(2)
    expect(cues[0]).toEqual({ start: 1000, end: 4000, text: '你好，世界' })
    expect(cues[1]).toEqual({ start: 5500, end: 8000, text: '第二行' })
  })

  it('容忍 CRLF 与逗号时间戳', () => {
    const cues = parseVtt('WEBVTT\r\n\r\n00:00:01,000 --> 00:00:02,000\r\nhello\r\n')
    expect(cues.length).toBe(1)
    expect(cues[0]!.start).toBe(1000)
  })

  it('缺少 WEBVTT 文件头抛中文错：空文件 / 非 VTT', () => {
    expect(() => parseVtt('')).toThrow(/缺少 WEBVTT 文件头/)
    expect(() => parseVtt('1\n00:00:01,000 --> 00:00:02,000\n文本\n')).toThrow(/缺少 WEBVTT 文件头/)
  })

  it('缺少时间轴的块抛中文错', () => {
    expect(() => parseVtt('WEBVTT\n\n没有时间轴的块\n')).toThrow(/缺少时间轴/)
  })

  it('时间轴残缺抛中文错', () => {
    expect(() => parseVtt('WEBVTT\n\n--> 00:00:02.000\n文本\n')).toThrow(/时间轴格式非法/)
    expect(() => parseVtt('WEBVTT\n\n00:00:01.000 -->\n文本\n')).toThrow(/时间轴格式非法/)
  })

  it('非法时间戳 / 结束早于开始抛中文错', () => {
    expect(() => parseVtt('WEBVTT\n\nxx --> 00:00:02.000\n文本\n')).toThrow(/时间戳非法/)
    expect(() => parseVtt('WEBVTT\n\n00:00:05.000 --> 00:00:02.000\n文本\n')).toThrow(
      /结束时间早于开始时间/,
    )
  })
})

describe('vtt-convert / 序列化', () => {
  const cues: SubtitleCue[] = [{ start: 1000, end: 4000, text: '你好' }]

  it('serializeVtt 带文件头，serializeSrt 带序号', () => {
    expect(serializeVtt(cues)).toBe('WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n你好\n')
    expect(serializeSrt(cues)).toBe('1\n00:00:01,000 --> 00:00:04,000\n你好\n')
  })

  it('cuesToText / cuesToJson', () => {
    expect(cuesToText(cues)).toBe('你好')
    expect(JSON.parse(cuesToJson(cues))).toEqual([{ start: 1000, end: 4000, text: '你好' }])
  })

  it('目标格式白名单校验', () => {
    expect(() => validateVttTarget('srt')).not.toThrow()
    expect(() => validateVttTarget('ass')).toThrow(/目标格式非法/)
    expect(VTT_TARGETS).toContain('txt')
  })
})

describe('vtt-convert / 时间轴偏移', () => {
  const cues: SubtitleCue[] = [{ start: 1000, end: 4000, text: 'a' }]

  it('正偏移 / 负偏移钳制 / 偏移量非法', () => {
    expect(shiftCues(cues, 2000)[0]).toEqual({ start: 3000, end: 6000, text: 'a' })
    expect(shiftCues(cues, -1500)[0]).toEqual({ start: 0, end: 2500, text: 'a' })
    expect(shiftCues(cues, -10000)).toEqual([])
    expect(() => shiftCues(cues, Number.NaN)).toThrow(/偏移量非法/)
    expect(cues[0]!.start).toBe(1000)
  })
})

describe('vtt-convert / 一站式转换', () => {
  it('VTT → SRT / 纯文本 / JSON / VTT', () => {
    const srt = convertVtt(SAMPLE, 'srt', 0)
    expect(srt).toContain('1\n00:00:01,000 --> 00:00:04,000\n你好，世界')
    expect(convertVtt(SAMPLE, 'txt', 0)).toBe('你好，世界\n第二行')
    expect(JSON.parse(convertVtt(SAMPLE, 'json', 0)).length).toBe(2)
    expect(convertVtt(SAMPLE, 'vtt', 0).startsWith('WEBVTT')).toBe(true)
  })

  it('VTT → SRT 带偏移', () => {
    const out = convertVtt(SAMPLE, 'srt', 1000)
    expect(out).toContain('00:00:02,000 --> 00:00:05,000')
  })

  it('空字幕抛中文错', () => {
    expect(() => convertVtt('WEBVTT\n\n', 'srt', 0)).toThrow(/字幕为空/)
  })

  it('偏移量非法透出中文错', () => {
    expect(() => convertVtt(SAMPLE, 'srt', Number.NaN)).toThrow(/偏移量非法/)
  })
})
