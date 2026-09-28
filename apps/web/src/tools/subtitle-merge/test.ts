import { describe, expect, it } from 'vitest'
import {
  MERGE_FORMATS,
  assTimeToMs,
  detectFormat,
  formatTimestamp,
  mergeSubtitles,
  parseAny,
  parseTimestamp,
  serializeSrt,
  serializeVtt,
  validateMergeFormat,
} from './utils'
import type { MergeFile } from './utils'

const SRT_A: MergeFile = {
  name: 'a.srt',
  text: `1
00:00:01,000 --> 00:00:04,000
你好

2
00:00:05,000 --> 00:00:08,000
第一份
`,
}

const VTT_B: MergeFile = {
  name: 'b.vtt',
  text: `WEBVTT

00:00:03.000 --> 00:00:06.000
第二份（与第一份重叠）

00:00:10.000 --> 00:00:12.000
第二份第二条
`,
}

const ASS_C: MergeFile = {
  name: 'c.ass',
  text: `[Script Info]
Title: x

[Events]
Format: Layer, Start, End, Text
Dialogue: 0,0:00:20.00,0:00:22.00,第三份
`,
}

describe('subtitle-merge / 时间戳', () => {
  it('两种分隔符与短式都识别', () => {
    expect(parseTimestamp('00:00:01,000')).toBe(1000)
    expect(parseTimestamp('00:00:01.000')).toBe(1000)
    expect(parseTimestamp('02:03.456')).toBe(123456)
  })

  it('非法时间戳抛中文错', () => {
    for (const bad of ['abc', '', '00:70:00.000']) {
      expect(() => parseTimestamp(bad)).toThrow(/时间戳非法/)
    }
    expect(() => parseTimestamp('  ')).toThrow(/（空）/)
  })

  it('ASS 时间戳', () => {
    expect(assTimeToMs('0:00:01.00')).toBe(1000)
    expect(() => assTimeToMs('xx')).toThrow(/ASS 时间戳非法/)
    expect(() => assTimeToMs('')).toThrow(/ASS 时间戳非法：.*（空）/)
    expect(() => assTimeToMs('   ')).toThrow(/（空）/)
    expect(() => assTimeToMs('0:70:00.00')).toThrow(/分钟 \/ 秒数应在/)
  })

  it('formatTimestamp 格式化与非法毫秒', () => {
    expect(formatTimestamp(3723456, ',')).toBe('01:02:03,456')
    expect(formatTimestamp(3723456, '.')).toBe('01:02:03.456')
    expect(() => formatTimestamp(-1, ',')).toThrow(/毫秒数非法/)
    expect(() => formatTimestamp(Number.NaN, ',')).toThrow(/毫秒数非法/)
  })
})

describe('subtitle-merge / 格式识别与解析', () => {
  it('detectFormat 识别三种格式与空文本', () => {
    expect(detectFormat(SRT_A.text)).toBe('srt')
    expect(detectFormat(VTT_B.text)).toBe('vtt')
    expect(detectFormat(ASS_C.text)).toBe('ass')
    expect(detectFormat('')).toBe('srt')
    expect(detectFormat('  \n\n  ')).toBe('srt')
  })

  it('detectFormat：首行非标记但含 [Events] 段时按启发式识别', () => {
    // 首行是备注，但文本含 [Events] + Format: → ass
    expect(
      detectFormat(
        '备注行\n[Events]\nFormat: Marked, Start, End, Text\nDialogue: Marked=0,0:00:01.00,0:00:02.00,你好\n',
      ),
    ).toBe('ass')
    // 含 [Events] 但无 Format:/Dialogue: 行 → 回落为 srt
    expect(detectFormat('备注行\n[Events]\n')).toBe('srt')
  })

  it('parseAny 按格式分发', () => {
    expect(parseAny(SRT_A.text).length).toBe(2)
    expect(parseAny(VTT_B.text).length).toBe(2)
    expect(parseAny(ASS_C.text).length).toBe(1)
    expect(parseAny(ASS_C.text)[0]).toEqual({ start: 20000, end: 22000, text: '第三份' })
  })

  it('SRT 解析边界：无序号 / 缺时间轴 / 结束早于开始', () => {
    expect(parseAny('00:00:01,000 --> 00:00:02,000\nhello\n').length).toBe(1)
    expect(() => parseAny('1\n没有时间轴\n')).toThrow(/缺少时间轴/)
    expect(() => parseAny('1\n00:00:05,000 --> 00:00:02,000\nx\n')).toThrow(/结束时间早于开始时间/)
    expect(() => parseAny('1\nxx --> 00:00:02,000\nx\n')).toThrow(/时间戳非法/)
  })

  it('VTT 解析边界：跳过 NOTE / cue settings / 缺时间轴', () => {
    const cues = parseAny(
      'WEBVTT\n\nNOTE 注释\n\n00:00:01.000 --> 00:00:02.000 align:center\n你好\n',
    )
    expect(cues.length).toBe(1)
    expect(cues[0]).toEqual({ start: 1000, end: 2000, text: '你好' })
    expect(() => parseAny('WEBVTT\n\n没有时间轴\n')).toThrow(/缺少时间轴/)
    expect(() => parseAny('WEBVTT\n\n00:00:05.000 --> 00:00:02.000\nx\n')).toThrow(
      /结束时间早于开始时间/,
    )
  })

  it('ASS 解析边界：缺 [Events] / 缺 Format / 缺字段 / 字段不足', () => {
    expect(() => parseAny('[Script Info]\nTitle: x\n')).toThrow(/缺少 \[Events\] 段/)
    expect(() => parseAny('[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,hi\n')).toThrow(
      /缺少 Format 行/,
    )
    expect(() => parseAny('[Events]\nFormat: Layer, End, Text\n')).toThrow(/缺少 Start/)
    expect(() => parseAny('[Events]\nFormat: Layer, Start, Text\n')).toThrow(/缺少 Start/)
    expect(() => parseAny('[Events]\nFormat: Layer, Start, End\n')).toThrow(/缺少 Start/)
    expect(() =>
      parseAny('[Events]\nFormat: Layer, Start, End, Text\nDialogue: 0,0:00:01.00\n'),
    ).toThrow(/字段不足/)
    expect(() =>
      parseAny('[Events]\nFormat: Layer, Start, End, Text\nDialogue: 0,0:00:05.00,0:00:02.00,x\n'),
    ).toThrow(/结束时间早于开始时间/)
  })

  it('serializeSrt / serializeVtt', () => {
    const cues = parseAny(SRT_A.text)
    expect(serializeSrt(cues)).toContain('1\n00:00:01,000 --> 00:00:04,000\n你好')
    expect(serializeVtt(cues).startsWith('WEBVTT')).toBe(true)
  })

  it('输出格式白名单校验', () => {
    expect(() => validateMergeFormat('srt')).not.toThrow()
    expect(() => validateMergeFormat('ass')).toThrow(/输出格式非法/)
    expect(MERGE_FORMATS).toContain('vtt')
  })
})

describe('subtitle-merge / 合并', () => {
  it('多文件按时间轴排序合并', () => {
    const r = mergeSubtitles([VTT_B, SRT_A], 0, 'srt')
    expect(r.stats.fileCount).toBe(2)
    expect(r.stats.totalParsed).toBe(4)
    // B 的第一条 3–6s 与 A 的 1–4s / 5–8s 重叠 → 被截
    expect(r.stats.trimmedOverlaps).toBeGreaterThan(0)
    expect(r.output).toContain('1\n00:00:01,000 --> 00:00:04,000\n你好')
    // 排序：第一条应为最早的 1s
    expect(r.output.indexOf('你好')).toBeLessThan(r.output.indexOf('第二份'))
  })

  it('完全相同的条目去重', () => {
    const r = mergeSubtitles([SRT_A, SRT_A], 0, 'srt')
    expect(r.stats.droppedDuplicates).toBe(2)
    expect(r.stats.merged).toBe(2)
  })

  it('重叠条目被截断到前一条结束', () => {
    const r = mergeSubtitles(
      [
        { name: 'x.srt', text: '1\n00:00:01,000 --> 00:00:05,000\n前\n' },
        { name: 'y.srt', text: '1\n00:00:03,000 --> 00:00:06,000\n后\n' },
      ],
      0,
      'srt',
    )
    expect(r.stats.trimmedOverlaps).toBe(1)
    expect(r.output).toContain('00:00:05,000 --> 00:00:06,000\n后')
  })

  it('被完全覆盖的条目截空后丢弃', () => {
    const r = mergeSubtitles(
      [
        { name: 'x.srt', text: '1\n00:00:01,000 --> 00:00:10,000\n前\n' },
        { name: 'y.srt', text: '1\n00:00:03,000 --> 00:00:05,000\n内\n' },
      ],
      0,
      'srt',
    )
    expect(r.stats.trimmedOverlaps).toBe(1)
    expect(r.stats.droppedEmpty).toBe(1)
    expect(r.stats.merged).toBe(1)
  })

  it('整体偏移：正偏移后移，负偏移钳制到 0', () => {
    const r = mergeSubtitles([SRT_A], 2000, 'srt')
    expect(r.output).toContain('00:00:03,000 --> 00:00:06,000')
    const r2 = mergeSubtitles([SRT_A], -1500, 'srt')
    expect(r2.output).toContain('00:00:00,000 --> 00:00:02,500')
  })

  it('超大负偏移导致条目全部变空 → 字幕为空', () => {
    expect(() => mergeSubtitles([SRT_A], -100000, 'srt')).toThrow(/字幕为空/)
  })

  it('输出 VTT 格式', () => {
    const r = mergeSubtitles([SRT_A], 0, 'vtt')
    expect(r.output.startsWith('WEBVTT')).toBe(true)
    expect(r.output).toContain('00:00:01.000 --> 00:00:04.000')
  })

  it('三种格式混排合并', () => {
    const r = mergeSubtitles([SRT_A, VTT_B, ASS_C], 0, 'srt')
    expect(r.stats.totalParsed).toBe(5)
    expect(r.output).toContain('第三份')
  })

  it('文件解析失败标注文件名', () => {
    expect(() =>
      mergeSubtitles([{ name: '坏.vtt', text: 'WEBVTT\n\n没有时间轴\n' }], 0, 'srt'),
    ).toThrow(/文件「坏\.vtt」解析失败/)
  })

  it('空文件列表 / 非法偏移 / 非法格式抛中文错', () => {
    expect(() => mergeSubtitles([], 0, 'srt')).toThrow(/至少提供一个字幕文件/)
    expect(() => mergeSubtitles([SRT_A], Number.NaN, 'srt')).toThrow(/偏移量非法/)
    expect(() => mergeSubtitles([SRT_A], 0, 'ass' as never)).toThrow(/输出格式非法/)
  })
})
