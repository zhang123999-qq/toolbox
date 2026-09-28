import { describe, expect, it } from 'vitest'
import {
  ASS_TARGETS,
  assTimeToMs,
  convertAss,
  cuesToJson,
  cuesToText,
  formatSrtTimestamp,
  msToAssTime,
  parseAss,
  parseAssFile,
  rebuildAssFull,
  rebuildAssMinimal,
  serializeSrt,
  serializeVtt,
  shiftDialogues,
  validateAssTarget,
} from './utils'

const SAMPLE = `[Script Info]
Title: 示例
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize
Style: Default,Arial,20

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Comment: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,这条注释行会被跳过
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,你好，世界
Dialogue: 0,0:00:05.50,0:00:08.00,Default,,0,0,0,,第二行，含，逗号
`

const SSA_SAMPLE = `[Events]
Format: Marked, Start, End, Text
Dialogue: Marked=0,0:00:01.00,0:00:02.00,你好
`

describe('ass-convert / ASS 时间戳', () => {
  it('H:MM:SS.cc 转毫秒，1–2 位小数自动补齐', () => {
    expect(assTimeToMs('0:00:01.00')).toBe(1000)
    expect(assTimeToMs('0:01:02.50')).toBe(62500)
    expect(assTimeToMs('1:02:03.456')).toBe(3723456)
    expect(assTimeToMs('0:00:01:5')).toBe(1500)
  })

  it('formatSrtTimestamp 格式化与非法毫秒', () => {
    expect(formatSrtTimestamp(3723456)).toBe('01:02:03,456')
    expect(formatSrtTimestamp(0)).toBe('00:00:00,000')
    expect(() => formatSrtTimestamp(-1)).toThrow(/毫秒数非法/)
    expect(() => formatSrtTimestamp(Number.NaN)).toThrow(/毫秒数非法/)
  })

  it('非法时间戳抛中文错', () => {
    for (const bad of ['abc', '', '0:00:01', '0:70:00.00', '0:00:70.00']) {
      expect(() => assTimeToMs(bad)).toThrow(/ASS 时间戳非法/)
    }
    expect(() => assTimeToMs('   ')).toThrow(/（空）/)
  })

  it('毫秒 → ASS 时间戳，百分秒', () => {
    expect(msToAssTime(1000)).toBe('0:00:01.00')
    expect(msToAssTime(62500)).toBe('0:01:02.50')
    expect(msToAssTime(3723456)).toBe('1:02:03.45')
    expect(msToAssTime(0)).toBe('0:00:00.00')
  })

  it('毫秒数非法抛中文错', () => {
    expect(() => msToAssTime(-1)).toThrow(/毫秒数非法/)
    expect(() => msToAssTime(Number.NaN)).toThrow(/毫秒数非法/)
  })
})

describe('ass-convert / 解析', () => {
  it('解析出对话行：Comment 跳过，文本含逗号完整保留', () => {
    const cues = parseAss(SAMPLE)
    expect(cues.length).toBe(2)
    expect(cues[0]).toEqual({ start: 1000, end: 4000, text: '你好，世界' })
    expect(cues[1]).toEqual({ start: 5500, end: 8000, text: '第二行，含，逗号' })
  })

  it('SSA 的 Marked= 前缀被兼容', () => {
    const cues = parseAss(SSA_SAMPLE)
    expect(cues.length).toBe(1)
    expect(cues[0]).toEqual({ start: 1000, end: 2000, text: '你好' })
  })

  it('容忍 CRLF', () => {
    const cues = parseAss(SAMPLE.replace(/\n/g, '\r\n'))
    expect(cues.length).toBe(2)
  })

  it('缺少 [Events] 段抛中文错', () => {
    expect(() => parseAssFile('[Script Info]\nTitle: x\n')).toThrow(/缺少 \[Events\] 段/)
  })

  it('缺少 Format 行抛中文错', () => {
    expect(() => parseAssFile('[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,hi\n')).toThrow(
      /缺少 Format 行/,
    )
  })

  it('Format 缺少 Start / End / Text 任一字段抛中文错', () => {
    const mk = (fmt: string): string => `[Events]\nFormat: ${fmt}\n`
    expect(() => parseAssFile(mk('Layer, End, Text'))).toThrow(/缺少 Start \/ End \/ Text/)
    expect(() => parseAssFile(mk('Layer, Start, Text'))).toThrow(/缺少 Start \/ End \/ Text/)
    expect(() => parseAssFile(mk('Layer, Start, End'))).toThrow(/缺少 Start \/ End \/ Text/)
  })

  it('Dialogue 字段不足抛中文错', () => {
    expect(() =>
      parseAssFile('[Events]\nFormat: Layer, Start, End, Text\nDialogue: 0,0:00:01.00\n'),
    ).toThrow(/字段不足/)
  })

  it('结束早于开始抛中文错', () => {
    expect(() =>
      parseAssFile(
        '[Events]\nFormat: Layer, Start, End, Text\nDialogue: 0,0:00:05.00,0:00:02.00,hi\n',
      ),
    ).toThrow(/结束时间早于开始时间/)
  })

  it('非法时间戳透出中文错', () => {
    expect(() =>
      parseAssFile('[Events]\nFormat: Layer, Start, End, Text\nDialogue: 0,xx,0:00:02.00,hi\n'),
    ).toThrow(/ASS 时间戳非法/)
  })
})

describe('ass-convert / 序列化', () => {
  it('serializeSrt / serializeVtt / cuesToText / cuesToJson', () => {
    const cues = parseAss(SAMPLE)
    expect(serializeSrt(cues)).toContain('1\n00:00:01,000 --> 00:00:04,000\n你好，世界')
    expect(serializeVtt(cues).startsWith('WEBVTT')).toBe(true)
    expect(cuesToText(cues)).toBe('你好，世界\n第二行，含，逗号')
    expect(JSON.parse(cuesToJson(cues)).length).toBe(2)
  })

  it('rebuildAssFull 保留样式段，rebuildAssMinimal 只留最小结构', () => {
    const file = parseAssFile(SAMPLE)
    const full = rebuildAssFull(file, file.dialogues)
    expect(full).toContain('[V4+ Styles]')
    expect(full).toContain('Dialogue: 0,0:00:01.00,0:00:04.00,')
    const minimal = rebuildAssMinimal(file.dialogues)
    expect(minimal).not.toContain('[V4+ Styles]')
    expect(minimal).toContain('[Script Info]')
    expect(minimal).toContain('Dialogue: 0,0:00:01.00,0:00:04.00,你好，世界')
  })

  it('目标格式白名单校验', () => {
    expect(() => validateAssTarget('ass')).not.toThrow()
    expect(() => validateAssTarget('xyz')).toThrow(/目标格式非法/)
    expect(ASS_TARGETS).toContain('json')
  })
})

describe('ass-convert / 时间轴偏移', () => {
  it('正偏移 / 负偏移钳制 / 非法偏移', () => {
    const dialogues = parseAssFile(SAMPLE).dialogues
    const shifted = shiftDialogues(dialogues, 2000)
    expect(shifted[0]!.start).toBe(3000)
    expect(shifted[0]!.text).toBe('你好，世界')
    expect(shiftDialogues(dialogues, -1500)[0]!.start).toBe(0)
    expect(shiftDialogues(dialogues, -10000)).toEqual([])
    expect(() => shiftDialogues(dialogues, Number.NaN)).toThrow(/偏移量非法/)
    expect(dialogues[0]!.start).toBe(1000)
  })
})

describe('ass-convert / 一站式转换', () => {
  it('ASS → SRT / VTT / 纯文本 / JSON', () => {
    expect(convertAss(SAMPLE, 'srt', 0, true)).toContain(
      '1\n00:00:01,000 --> 00:00:04,000\n你好，世界',
    )
    expect(convertAss(SAMPLE, 'vtt', 0, true).startsWith('WEBVTT')).toBe(true)
    expect(convertAss(SAMPLE, 'txt', 0, true)).toBe('你好，世界\n第二行，含，逗号')
    expect(JSON.parse(convertAss(SAMPLE, 'json', 0, true)).length).toBe(2)
  })

  it('ASS → ASS 保留样式段', () => {
    const out = convertAss(SAMPLE, 'ass', 0, true)
    expect(out).toContain('[V4+ Styles]')
    expect(out).toContain('Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,你好，世界')
  })

  it('ASS → ASS 丢弃样式段', () => {
    const out = convertAss(SAMPLE, 'ass', 0, false)
    expect(out).not.toContain('[V4+ Styles]')
    expect(out).toContain('Dialogue: 0,0:00:01.00,0:00:04.00,你好，世界')
  })

  it('ASS → ASS 带偏移', () => {
    const out = convertAss(SAMPLE, 'ass', 1000, false)
    expect(out).toContain('Dialogue: 0,0:00:02.00,0:00:05.00,你好，世界')
  })

  it('空字幕抛中文错', () => {
    const noDialogue = '[Events]\nFormat: Layer, Start, End, Text\n'
    expect(() => convertAss(noDialogue, 'srt', 0, true)).toThrow(/字幕为空/)
  })

  it('偏移量非法透出中文错', () => {
    expect(() => convertAss(SAMPLE, 'srt', Number.NaN, true)).toThrow(/偏移量非法/)
  })

  it('目标格式非法透出中文错', () => {
    expect(() => convertAss(SAMPLE, 'xyz' as never, 0, true)).toThrow(/目标格式非法/)
  })
})
