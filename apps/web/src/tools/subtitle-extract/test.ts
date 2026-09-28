import { describe, expect, it } from 'vitest'
import {
  SUBTITLE_FORMATS,
  assertValidSubtitleFormat,
  buildExtractArgs,
  formatBytes,
  formatSeconds,
  parseMediaDuration,
  parseSubtitleStreams,
  probeArgs,
  subtitleFileName,
} from './utils'

const SAMPLE_STDERR = [
  "Input #0, matroska,webm, from 'movie.mkv':",
  '  Duration: 00:01:23.45, start: 0.000000, bitrate: 1200 kb/s',
  '  Stream #0:0(eng): Video: h264',
  '  Stream #0:1(eng): Audio: aac',
  '  Stream #0:2(eng): Subtitle: subrip (default)',
  '  Stream #0:3(chi): Subtitle: ass',
  '  Stream #0:4: Subtitle: mov_text (forced)',
].join('\n')

describe('subtitle-extract / 解析字幕流', () => {
  it('SUBTITLE_FORMATS 含三种格式', () => {
    expect([...SUBTITLE_FORMATS]).toEqual(['srt', 'vtt', 'ass'])
  })

  it('解析出全部字幕流，跳过音视频流', () => {
    const streams = parseSubtitleStreams(SAMPLE_STDERR)
    expect(streams.length).toBe(3)
    expect(streams[0]).toEqual({
      streamIndex: 2,
      subIndex: 0,
      codec: 'subrip',
      language: 'eng',
      note: 'default',
    })
    expect(streams[1]).toEqual({
      streamIndex: 3,
      subIndex: 1,
      codec: 'ass',
      language: 'chi',
      note: '',
    })
    // 无语言括号 → und；有 forced 备注
    expect(streams[2]).toEqual({
      streamIndex: 4,
      subIndex: 2,
      codec: 'mov_text',
      language: 'und',
      note: 'forced',
    })
  })

  it('兼容 \\r\\n 换行', () => {
    const streams = parseSubtitleStreams('Stream #0:2(eng): Subtitle: subrip\r\n')
    expect(streams.length).toBe(1)
    expect(streams[0]!.codec).toBe('subrip')
  })

  it('没有字幕流 → 空数组', () => {
    expect(parseSubtitleStreams('Stream #0:0: Video: h264\n')).toEqual([])
    expect(parseSubtitleStreams('')).toEqual([])
    expect(parseSubtitleStreams('garbage line\nStream #0:9: Data: bin_data\n')).toEqual([])
  })

  it('assertValidSubtitleFormat：合法通过，非法抛中文错', () => {
    expect(() => assertValidSubtitleFormat('srt')).not.toThrow()
    expect(() => assertValidSubtitleFormat('vtt')).not.toThrow()
    expect(() => assertValidSubtitleFormat('ass')).not.toThrow()
    expect(() => assertValidSubtitleFormat('ssa')).toThrow(/输出字幕格式非法/)
    expect(() => assertValidSubtitleFormat('')).toThrow(/输出字幕格式非法/)
  })
})

describe('subtitle-extract / 时长与参数', () => {
  it('parseMediaDuration：有时长返回秒数，无则 null', () => {
    expect(parseMediaDuration(SAMPLE_STDERR)).toBeCloseTo(83.45, 6)
    expect(parseMediaDuration('Duration: 01:00:00.00, bitrate: 1 kb/s')).toBe(3600)
    expect(parseMediaDuration('Duration: N/A, bitrate: N/A')).toBeNull()
    expect(parseMediaDuration('no duration here')).toBeNull()
  })

  it('probeArgs：只列流信息', () => {
    expect(probeArgs('input-1')).toEqual(['-hide_banner', '-i', 'input-1'])
  })

  it('buildExtractArgs：-map 选中字幕流并转码', () => {
    expect(buildExtractArgs('in.mkv', 0, 'srt', 'out.srt')).toEqual([
      '-hide_banner',
      '-y',
      '-i',
      'in.mkv',
      '-map',
      '0:s:0',
      '-c:s',
      'srt',
      'out.srt',
    ])
    expect(buildExtractArgs('in.mkv', 2, 'vtt', 'out.vtt')).toContain('webvtt')
    expect(buildExtractArgs('in.mkv', 1, 'ass', 'out.ass')).toContain('ass')
  })

  it('buildExtractArgs：非法序号 / 格式抛中文错', () => {
    expect(() => buildExtractArgs('in.mkv', -1, 'srt', 'out.srt')).toThrow(/字幕流序号非法/)
    expect(() => buildExtractArgs('in.mkv', 1.5, 'srt', 'out.srt')).toThrow(/字幕流序号非法/)
    expect(() => buildExtractArgs('in.mkv', 0, 'ssa' as never, 'out.ssa')).toThrow(
      /输出字幕格式非法/,
    )
  })

  it('subtitleFileName', () => {
    expect(subtitleFileName('movie.mkv', 0, 'srt')).toBe('movie-sub0.srt')
    expect(subtitleFileName('a.b.mp4', 2, 'vtt')).toBe('a.b-sub2.vtt')
    expect(subtitleFileName('noext', 1, 'ass')).toBe('noext-sub1.ass')
    expect(subtitleFileName('.mkv', 0, 'srt')).toBe('video-sub0.srt')
    expect(() => subtitleFileName('a.mkv', 0, 'ssa' as never)).toThrow(/输出字幕格式非法/)
  })
})

describe('subtitle-extract / 杂项', () => {
  it('formatSeconds / formatBytes', () => {
    expect(formatSeconds(1.236)).toBe('1.24 秒')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})
