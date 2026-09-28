import { describe, expect, it } from 'vitest'
import {
  ALIGN_MODES,
  MAX_TRACKS,
  assertValidAlignMode,
  assertValidChannels,
  assertValidVolume,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  makeSineTone,
  mixAudios,
  mixFileName,
} from './utils'
import type { MixTrack, PcmAudio } from './utils'

/** 常量幅度音频：断言叠加结果更直观 */
function makeFlat(sampleRate: number, frames: number, amp: number, channels = 1): PcmAudio {
  const list: Float32Array[] = []
  for (let c = 0; c < channels; c++) list.push(new Float32Array(frames).fill(amp))
  return { sampleRate, channels: list }
}

const track = (audio: PcmAudio, volume: number): MixTrack => ({ audio, volume })

describe('audio-mix / 对齐方式与音量校验', () => {
  it('ALIGN_MODES 含三种方式', () => {
    expect([...ALIGN_MODES]).toEqual(['shortest', 'longest', 'loop'])
  })

  it('assertValidAlignMode：合法通过，非法抛中文错', () => {
    expect(() => assertValidAlignMode('shortest')).not.toThrow()
    expect(() => assertValidAlignMode('longest')).not.toThrow()
    expect(() => assertValidAlignMode('loop')).not.toThrow()
    expect(() => assertValidAlignMode('truncate')).toThrow(/对齐方式非法/)
    expect(() => assertValidAlignMode('')).toThrow(/对齐方式非法/)
  })

  it('assertValidVolume：合法通过，非法抛中文错', () => {
    expect(() => assertValidVolume(0)).not.toThrow()
    expect(() => assertValidVolume(1)).not.toThrow()
    expect(() => assertValidVolume(2)).not.toThrow()
    for (const bad of [-0.1, 2.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertValidVolume(bad)).toThrow(/音量非法/)
    }
  })
})

describe('audio-mix / 混音', () => {
  it('基本混音：同采样点相加', () => {
    const out = mixAudios(
      [track(makeFlat(8000, 100, 0.3), 1), track(makeFlat(8000, 100, 0.4), 1)],
      'shortest',
    )
    expect(out.channels[0]!.length).toBe(100)
    expect(out.channels[0]![0]).toBeCloseTo(0.7, 6)
    expect(out.sampleRate).toBe(8000)
  })

  it('音量配比：50% 即减半；超出范围钳制', () => {
    const out = mixAudios(
      [track(makeFlat(8000, 100, 0.8), 0.5), track(makeFlat(8000, 100, 0.8), 1)],
      'shortest',
    )
    // 0.4 + 0.8 = 1.2 → 钳制到 1
    expect(out.channels[0]![0]).toBe(1)
  })

  it('相加超出范围钳制到 [-1, 1]', () => {
    const out = mixAudios(
      [track(makeFlat(8000, 100, 0.9), 1), track(makeFlat(8000, 100, 0.9), 1)],
      'shortest',
    )
    expect(out.channels[0]![0]).toBe(1)
    const out2 = mixAudios(
      [track(makeFlat(8000, 100, -0.9), 1), track(makeFlat(8000, 100, -0.9), 1)],
      'shortest',
    )
    expect(out2.channels[0]![0]).toBe(-1)
  })

  it('shortest：输出与最短等长，多余截断', () => {
    const out = mixAudios(
      [track(makeFlat(8000, 200, 0.3), 1), track(makeFlat(8000, 100, 0.3), 1)],
      'shortest',
    )
    expect(out.channels[0]!.length).toBe(100)
  })

  it('longest：短音轨缺失部分补零', () => {
    const out = mixAudios(
      [track(makeFlat(8000, 200, 0.3), 1), track(makeFlat(8000, 100, 0.2), 1)],
      'longest',
    )
    expect(out.channels[0]!.length).toBe(200)
    expect(out.channels[0]![50]).toBeCloseTo(0.5, 6)
    expect(out.channels[0]![150]).toBeCloseTo(0.3, 6)
  })

  it('loop：短音轨循环补齐', () => {
    // 短音轨：前 2 采样为 0.1，其余 0；循环后每 4 采样重复
    const short = makeFlat(8000, 4, 0)
    short.channels[0]![0] = 0.1
    short.channels[0]![1] = 0.1
    const out = mixAudios([track(short, 1), track(makeFlat(8000, 12, 0), 1)], 'loop')
    expect(out.channels[0]!.length).toBe(12)
    expect(out.channels[0]![0]).toBeCloseTo(0.1, 6)
    expect(out.channels[0]![4]).toBeCloseTo(0.1, 6)
    expect(out.channels[0]![8]).toBeCloseTo(0.1, 6)
    expect(out.channels[0]![2]).toBeCloseTo(0, 6)
  })

  it('loop 下空音轨按全零处理（不产生 NaN）', () => {
    const empty = makeFlat(8000, 0, 0)
    const out = mixAudios([track(makeFlat(8000, 10, 0.3), 1), track(empty, 1)], 'loop')
    expect(out.channels[0]!.length).toBe(10)
    expect(out.channels[0]![5]).toBeCloseTo(0.3, 6)
    expect(Number.isNaN(out.channels[0]![5])).toBe(false)
  })

  it('立体声：各声道独立混音', () => {
    const a = makeFlat(8000, 50, 0.2, 2)
    const b = makeFlat(8000, 50, 0.3, 2)
    const out = mixAudios([track(a, 1), track(b, 1)], 'shortest')
    expect(out.channels.length).toBe(2)
    expect(out.channels[1]![10]).toBeCloseTo(0.5, 6)
  })

  it('不修改输入音频', () => {
    const a = makeFlat(8000, 50, 0.2)
    const before = Array.from(a.channels[0]!)
    mixAudios([track(a, 2), track(makeFlat(8000, 50, 0.2), 1)], 'shortest')
    expect(Array.from(a.channels[0]!)).toEqual(before)
  })

  it('三路混音', () => {
    const out = mixAudios(
      [
        track(makeFlat(8000, 60, 0.2), 1),
        track(makeFlat(8000, 60, 0.2), 1),
        track(makeFlat(8000, 60, 0.2), 1),
      ],
      'shortest',
    )
    expect(out.channels[0]![0]).toBeCloseTo(0.6, 6)
  })

  it('音轨数不足 / 过多抛中文错', () => {
    const a = track(makeFlat(8000, 50, 0.2), 1)
    expect(() => mixAudios([], 'shortest')).toThrow(/至少需要 2 路/)
    expect(() => mixAudios([a], 'shortest')).toThrow(/至少需要 2 路/)
    const many = Array.from({ length: MAX_TRACKS + 1 }, () => track(makeFlat(8000, 50, 0.1), 1))
    expect(() => mixAudios(many, 'shortest')).toThrow(/音轨过多/)
  })

  it('全部为空音频抛中文错', () => {
    const e = track(makeFlat(8000, 0, 0), 1)
    expect(() => mixAudios([e, e], 'shortest')).toThrow(/没有可混音的内容/)
  })

  it('采样率 / 声道数不一致抛中文错', () => {
    const a = track(makeFlat(8000, 50, 0.2), 1)
    const b = track(makeFlat(16000, 50, 0.2), 1)
    expect(() => mixAudios([a, b], 'shortest')).toThrow(/采样率不一致/)
    const mono = track(makeFlat(8000, 50, 0.2, 1), 1)
    const stereo = track(makeFlat(8000, 50, 0.2, 2), 1)
    expect(() => mixAudios([mono, stereo], 'shortest')).toThrow(/声道数不一致/)
  })

  it('非法音量 / 采样率 / 声道 / 对齐方式抛中文错', () => {
    const good = track(makeFlat(8000, 50, 0.2), 1)
    expect(() => mixAudios([good, track(makeFlat(8000, 50, 0.2), -1)], 'shortest')).toThrow(
      /音量非法/,
    )
    expect(() => mixAudios([good, track(makeFlat(8000, 50, 0.2), Number.NaN)], 'shortest')).toThrow(
      /音量非法/,
    )
    const badRate = track({ sampleRate: 999, channels: [new Float32Array(50)] }, 1)
    expect(() => mixAudios([good, badRate], 'shortest')).toThrow(/采样率非法/)
    const badCh = track({ sampleRate: 8000, channels: [] }, 1)
    expect(() => mixAudios([good, badCh], 'shortest')).toThrow(/声道数非法/)
    const badCh2 = track(
      { sampleRate: 8000, channels: [new Float32Array(50), new Float32Array(10)] },
      1,
    )
    expect(() => mixAudios([good, badCh2], 'shortest')).toThrow(/声道长度不一致/)
    expect(() => mixAudios([good, good], 'mix' as never)).toThrow(/对齐方式非法/)
  })
})

describe('audio-mix / 杂项', () => {
  it('声道校验', () => {
    expect(() => assertValidChannels([new Float32Array(8)])).not.toThrow()
    expect(() => assertValidChannels([])).toThrow(/至少需要 1 个声道/)
    expect(() => assertValidChannels([new Float32Array(8), new Float32Array(4)])).toThrow(
      /声道长度不一致/,
    )
  })

  it('durationSec / formatSeconds / formatBytes', () => {
    expect(durationSec(makeSineTone(8000, 2, 440))).toBe(2)
    expect(formatSeconds(1.236)).toBe('1.24 秒')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })

  it('makeSineTone 非法参数抛中文错', () => {
    expect(() => makeSineTone(999, 1, 440)).toThrow(/采样率非法/)
    expect(() => makeSineTone(8000, 0, 440)).toThrow(/时长非法/)
    expect(() => makeSineTone(8000, 1, 0)).toThrow(/频率非法/)
    expect(() => makeSineTone(8000, 1, 440, 9)).toThrow(/声道数非法/)
  })

  it('encodeWavPcm 三元钳制三分支', () => {
    const wav = encodeWavPcm({ sampleRate: 8000, channels: [new Float32Array([-2, 2, 0.5])] })
    const view = new DataView(wav.buffer)
    expect(view.getInt16(44, true)).toBe(-32767)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(Math.round(0.5 * 32767))
  })

  it('mixFileName 固定命名', () => {
    expect(mixFileName()).toBe('audio-mix.wav')
  })
})
