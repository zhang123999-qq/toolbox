import { describe, expect, it } from 'vitest'
import {
  assColor,
  BURN_POSITIONS,
  buildBurnArgs,
  burnFileName,
  cuesToSrt,
  detectSubtitleFormat,
  escapeFilterPath,
  formatSrtTime,
  normalizeSubtitles,
  parseSrt,
  parseSrtTime,
  parseVtt,
  parseVttTime,
  validateBurnStyle,
} from './utils'
import type { BurnStyle, SubtitleCue } from './utils'

const SRT_SAMPLE = `1
00:00:01,000 --> 00:00:04,000
第一行字幕

2
00:00:05,500 --> 00:00:08,000
第二行字幕
多行文本
`

const VTT_SAMPLE = `WEBVTT
Kind: captions

00:00:01.000 --> 00:00:04.000
第一行字幕

NOTE 这是注释块，会被忽略

00:00:05.500 --> 00:00:08.000 position:50%
第二行 <b>字幕</b>
`

const GOOD_STYLE: BurnStyle = { fontSize: 24, fontColor: '#FFFFFF', position: 'bottom' }

describe('subtitle-burn / 时间解析与格式化', () => {
  it('parseSrtTime 解析逗号与点分隔的毫秒', () => {
    expect(parseSrtTime('00:00:01,000')).toBe(1)
    expect(parseSrtTime('01:02:03.500')).toBe(3723.5)
    expect(parseSrtTime('00:00:01,5')).toBe(1.5)
    expect(parseSrtTime('  00:00:01,000  ')).toBe(1)
  })

  it('parseSrtTime 非法格式抛中文错', () => {
    for (const bad of ['abc', '00:00:01', '0:0:1,000', '00:60:01,000', '00:00:61,000', '']) {
      expect(() => parseSrtTime(bad)).toThrow(/SRT 时间格式非法/)
    }
  })

  it('parseVttTime 只接受点分隔毫秒', () => {
    expect(parseVttTime('00:00:01.000')).toBe(1)
    expect(parseVttTime('10:00:00.250')).toBe(36000.25)
    for (const bad of ['00:00:01,000', '00:00:01.00', 'abc']) {
      expect(() => parseVttTime(bad)).toThrow(/VTT 时间格式非法/)
    }
  })

  it('formatSrtTime 格式化并处理边界', () => {
    expect(formatSrtTime(1)).toBe('00:00:01,000')
    expect(formatSrtTime(3723.5678)).toBe('01:02:03,568')
    expect(formatSrtTime(0)).toBe('00:00:00,000')
    expect(() => formatSrtTime(-1)).toThrow(/时间非法/)
    expect(() => formatSrtTime(Number.NaN)).toThrow(/时间非法/)
    expect(() => formatSrtTime(Number.POSITIVE_INFINITY)).toThrow(/时间非法/)
  })
})

describe('subtitle-burn / SRT 解析', () => {
  it('解析标准 SRT（含多行文本）', () => {
    const cues = parseSrt(SRT_SAMPLE)
    expect(cues.length).toBe(2)
    expect(cues[0]).toMatchObject({ index: 1, start: 1, end: 4, text: '第一行字幕' })
    expect(cues[1]).toMatchObject({ index: 2, start: 5.5, end: 8, text: '第二行字幕\n多行文本' })
  })

  it('兼容无序号行的 SRT 与 CRLF 换行', () => {
    const cues = parseSrt('00:00:01,000 --> 00:00:02,000\r\nHi\r\n')
    expect(cues.length).toBe(1)
    expect(cues[0]!.text).toBe('Hi')
  })

  it('空文本 / 缺时间行 / 时间倒置 / 无文本抛中文错', () => {
    expect(() => parseSrt('')).toThrow(/字幕内容为空/)
    expect(() => parseSrt('   \n  ')).toThrow(/字幕内容为空/)
    expect(() => parseSrt('1\nhello')).toThrow(/缺少合法的时间行/)
    expect(() => parseSrt('1\n00:00:05,000 --> 00:00:02,000\nHi')).toThrow(
      /开始时间必须早于结束时间/,
    )
    expect(() => parseSrt('1\n00:00:01,000 --> 00:00:02,000\n   ')).toThrow(/没有文本内容/)
    expect(() => parseSrt('1\nnot-a-time --> nope\nHi')).toThrow(/SRT 时间格式非法/)
    expect(() => parseSrt('只有一行没有时间')).toThrow(/缺少合法的时间行/)
  })
})

describe('subtitle-burn / VTT 解析', () => {
  it('解析 WEBVTT（含头部附加行、NOTE 注释、cue settings、内联标签）', () => {
    const cues = parseVtt(VTT_SAMPLE)
    expect(cues.length).toBe(2)
    expect(cues[0]).toMatchObject({ index: 1, start: 1, end: 4, text: '第一行字幕' })
    // cue settings 被忽略，<b> 标签被剥离
    expect(cues[1]).toMatchObject({ index: 2, start: 5.5, end: 8, text: '第二行 字幕' })
  })

  it('WEBVTT 头的三种写法都被识别', () => {
    const mk = (head: string) => `${head}\n\n00:00:01.000 --> 00:00:02.000\nHi\n`
    expect(parseVtt(mk('WEBVTT')).length).toBe(1)
    expect(parseVtt(mk('WEBVTT\nKind: captions')).length).toBe(1)
    expect(parseVtt(mk('WEBVTT - 标题')).length).toBe(1)
  })

  it('空文本 / 缺时间行 / 时间倒置 / 无文本抛中文错', () => {
    expect(() => parseVtt('')).toThrow(/字幕内容为空/)
    expect(() => parseVtt('WEBVTT')).toThrow(/字幕内容为空/)
    expect(() => parseVtt('WEBVTT\n\nSTYLE\n::cue { color: red }')).toThrow(/缺少合法的时间行/)
    expect(() => parseVtt('-->\nHi')).toThrow(/字幕时间行格式非法/)
    expect(() => parseVtt('00:00:05.000 --> 00:00:02.000\nHi')).toThrow(/开始时间必须早于结束时间/)
    expect(() => parseVtt('00:00:01.000 --> 00:00:02.000\n<b></b>')).toThrow(/没有文本内容/)
  })
})

describe('subtitle-burn / 格式探测与归一化', () => {
  it('WEBVTT 头 → vtt；逗号毫秒 → srt', () => {
    expect(detectSubtitleFormat(VTT_SAMPLE)).toBe('vtt')
    expect(detectSubtitleFormat(SRT_SAMPLE)).toBe('srt')
  })

  it('无 WEBVTT 头时按毫秒分隔符区分', () => {
    expect(detectSubtitleFormat('00:00:01.000 --> 00:00:02.000\nHi')).toBe('vtt')
    expect(detectSubtitleFormat('00:00:01,000 --> 00:00:02.000\nHi')).toBe('vtt')
    expect(detectSubtitleFormat('00:00:01,000 --> 00:00:02,000\nHi')).toBe('srt')
  })

  it('空文本 / 无时间行抛中文错', () => {
    expect(() => detectSubtitleFormat('')).toThrow(/字幕内容为空/)
    expect(() => detectSubtitleFormat('hello world')).toThrow(/无法识别字幕格式/)
  })

  it('normalizeSubtitles 自动识别并解析', () => {
    expect(normalizeSubtitles(SRT_SAMPLE).length).toBe(2)
    expect(normalizeSubtitles(VTT_SAMPLE).length).toBe(2)
    expect(() => normalizeSubtitles('')).toThrow(/字幕内容为空/)
  })

  it('cuesToSrt 导出标准 SRT', () => {
    const cues: SubtitleCue[] = [
      { index: 7, start: 1, end: 2.5, text: 'Hi' },
      { index: 9, start: 65, end: 66.001, text: 'Bye' },
    ]
    const srt = cuesToSrt(cues)
    expect(srt).toBe(
      '1\n00:00:01,000 --> 00:00:02,500\nHi\n\n2\n00:01:05,000 --> 00:01:06,001\nBye\n',
    )
    // 往返：导出后再解析
    expect(parseSrt(srt).length).toBe(2)
    expect(() => cuesToSrt([])).toThrow(/没有字幕条目/)
  })
})

describe('subtitle-burn / 样式与 ffmpeg 参数', () => {
  it('合法样式通过校验', () => {
    expect(() => validateBurnStyle(GOOD_STYLE)).not.toThrow()
    expect(() =>
      validateBurnStyle({ fontSize: 8, fontColor: '#000000', position: 'top' }),
    ).not.toThrow()
    expect(() =>
      validateBurnStyle({ fontSize: 96, fontColor: '#abcdef', position: 'middle' }),
    ).not.toThrow()
    expect(BURN_POSITIONS).toEqual(['top', 'middle', 'bottom'])
  })

  it('非法样式抛中文错', () => {
    expect(() => validateBurnStyle({ ...GOOD_STYLE, fontSize: 7 })).toThrow(/字号非法/)
    expect(() => validateBurnStyle({ ...GOOD_STYLE, fontSize: 97 })).toThrow(/字号非法/)
    expect(() => validateBurnStyle({ ...GOOD_STYLE, fontSize: 12.5 })).toThrow(/字号非法/)
    expect(() => validateBurnStyle({ ...GOOD_STYLE, fontColor: 'red' })).toThrow(/字体颜色非法/)
    expect(() => validateBurnStyle({ ...GOOD_STYLE, fontColor: '#FFF' })).toThrow(/字体颜色非法/)
    expect(() =>
      validateBurnStyle({ ...GOOD_STYLE, position: 'left' as BurnStyle['position'] }),
    ).toThrow(/字幕位置非法/)
  })

  it('assColor 把 #RRGGBB 转成 ASS 的 &H00BBGGRR（大写）', () => {
    expect(assColor('#FF0000')).toBe('&H000000FF')
    expect(assColor('#123456')).toBe('&H00563412')
    expect(assColor('#ffffff')).toBe('&H00FFFFFF')
    expect(() => assColor('red')).toThrow(/字体颜色非法/)
  })

  it('escapeFilterPath 转义反斜杠 / 单引号 / 冒号', () => {
    expect(escapeFilterPath('sub.srt')).toBe('sub.srt')
    expect(escapeFilterPath("a'b:c\\d.srt")).toBe("a\\'b\\:c\\\\d.srt")
    expect(() => escapeFilterPath('')).toThrow(/文件路径不能为空/)
  })

  it('buildBurnArgs 拼出 subtitles 滤镜参数', () => {
    const args = buildBurnArgs('in.mp4', 'sub.srt', 'out.mp4', GOOD_STYLE)
    expect(args[0]).toBe('-i')
    expect(args[1]).toBe('in.mp4')
    expect(args[2]).toBe('-vf')
    expect(args[3]).toContain('subtitles=sub.srt')
    expect(args[3]).toContain('FontSize=24')
    expect(args[3]).toContain('PrimaryColour=&H00FFFFFF')
    expect(args[3]).toContain('Alignment=2')
    expect(args.slice(4)).toEqual(['-c:a', 'copy', 'out.mp4'])
  })

  it('顶部 / 中部位置对应正确的 ASS 对齐码', () => {
    expect(
      buildBurnArgs('a.mp4', 'b.srt', 'c.mp4', { ...GOOD_STYLE, position: 'top' })[3],
    ).toContain('Alignment=8')
    expect(
      buildBurnArgs('a.mp4', 'b.srt', 'c.mp4', { ...GOOD_STYLE, position: 'middle' })[3],
    ).toContain('Alignment=5')
  })

  it('空文件名或非法样式抛中文错', () => {
    expect(() => buildBurnArgs('', 'b.srt', 'c.mp4', GOOD_STYLE)).toThrow(/文件名不能为空/)
    expect(() => buildBurnArgs('a.mp4', '', 'c.mp4', GOOD_STYLE)).toThrow(/文件名不能为空/)
    expect(() => buildBurnArgs('a.mp4', 'b.srt', '', GOOD_STYLE)).toThrow(/文件名不能为空/)
    expect(() => buildBurnArgs('a.mp4', 'b.srt', 'c.mp4', { ...GOOD_STYLE, fontSize: 7 })).toThrow(
      /字号非法/,
    )
  })

  it('burnFileName 生成输出名', () => {
    expect(burnFileName('movie.mp4')).toBe('movie-sub.mp4')
    expect(burnFileName('a.b.mkv')).toBe('a.b-sub.mp4')
    expect(burnFileName('novideo')).toBe('novideo-sub.mp4')
    expect(burnFileName('.mp4')).toBe('video-sub.mp4')
  })
})
