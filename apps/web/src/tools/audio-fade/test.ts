import { describe, expect, it } from 'vitest'
import {
  FADE_CURVES,
  MAX_FADE_SEC,
  applyFade,
  assertValidChannels,
  assertValidFadeCurve,
  durationSec,
  encodeWavPcm,
  fadeFileName,
  fadeGain,
  formatBytes,
  formatSeconds,
  makeSineTone,
} from './utils'

/** 常量幅度的测试音频（断言增益更直观） */
function makeFlat(sampleRate = 8000, seconds = 2, amp = 0.8, channels = 1) {
  const frames = sampleRate * seconds
  const list: Float32Array[] = []
  for (let c = 0; c < channels; c++) list.push(new Float32Array(frames).fill(amp))
  return { sampleRate, channels: list }
}

describe('audio-fade / 曲线与增益', () => {
  it('FADE_CURVES 含两种曲线', () => {
    expect([...FADE_CURVES]).toEqual(['linear', 'exponential'])
  })

  it('线性增益', () => {
    expect(fadeGain(0, 'linear')).toBe(0)
    expect(fadeGain(0.5, 'linear')).toBe(0.5)
    expect(fadeGain(1, 'linear')).toBe(1)
  })

  it('指数增益：端点为 0/1，中间低于线性（起音更柔和）', () => {
    expect(fadeGain(0, 'exponential')).toBe(0)
    expect(fadeGain(1, 'exponential')).toBe(1)
    const mid = fadeGain(0.5, 'exponential')
    expect(mid).toBeCloseTo((Math.exp(1.5) - 1) / (Math.exp(3) - 1), 12)
    expect(mid).toBeLessThan(0.5)
    expect(fadeGain(0.25, 'exponential')).toBeLessThan(fadeGain(0.75, 'exponential'))
  })

  it('非法曲线 / 位置抛中文错', () => {
    expect(() => assertValidFadeCurve('linear')).not.toThrow()
    expect(() => assertValidFadeCurve('exponential')).not.toThrow()
    expect(() => assertValidFadeCurve('cosine')).toThrow(/淡入淡出曲线非法/)
    expect(() => assertValidFadeCurve('')).toThrow(/淡入淡出曲线非法/)
    for (const bad of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => fadeGain(bad, 'linear')).toThrow(/淡入淡出位置非法/)
    }
    expect(() => fadeGain(0.5, 'cosine' as never)).toThrow(/淡入淡出曲线非法/)
  })
})

describe('audio-fade / 应用淡入淡出', () => {
  it('线性淡入淡出：首尾归零，中间不受影响', () => {
    const audio = makeFlat(8000, 2, 0.8)
    const out = applyFade(audio, 0.5, 0.5, 'linear')
    expect(out.channels[0]![0]).toBe(0)
    expect(out.channels[0]![3999]).toBeCloseTo(0.8, 6)
    expect(out.channels[0]![4000]).toBeCloseTo(0.8, 6)
    expect(out.channels[0]![12000]).toBeCloseTo(0.8, 6)
    expect(out.channels[0]![15999]).toBe(0)
    // 淡出半程：idx = 15999 - 2000，增益 2000/3999
    expect(out.channels[0]![13999]).toBeCloseTo(0.8 * (2000 / 3999), 5)
  })

  it('指数淡入：中间增益低于线性', () => {
    const audio = makeFlat(8000, 2, 1)
    const lin = applyFade(audio, 0.5, 0, 'linear')
    const exp = applyFade(audio, 0.5, 0, 'exponential')
    expect(exp.channels[0]![2000]).toBeLessThan(lin.channels[0]![2000])
    expect(exp.channels[0]![0]).toBe(0)
    expect(exp.channels[0]![3999]).toBeCloseTo(1, 6)
  })

  it('淡入淡出时长为 0 时原样返回', () => {
    const audio = makeFlat(8000, 1, 0.5)
    const out = applyFade(audio, 0, 0, 'linear')
    expect(Array.from(out.channels[0]!)).toEqual(Array.from(audio.channels[0]!))
  })

  it('单采样点淡入：增益为 0（覆盖 inSamples<=1 分支）', () => {
    const audio = makeFlat(8000, 1, 0.8)
    const out = applyFade(audio, 1 / 8000, 0, 'linear')
    expect(out.channels[0]![0]).toBe(0)
    expect(out.channels[0]![1]).toBeCloseTo(0.8, 6)
  })

  it('单采样点淡出：增益为 0', () => {
    const audio = makeFlat(8000, 1, 0.8)
    const out = applyFade(audio, 0, 1 / 8000, 'linear')
    expect(out.channels[0]![7999]).toBe(0)
    expect(out.channels[0]![7998]).toBeCloseTo(0.8, 6)
  })

  it('立体声各声道同步淡入淡出，不修改原音频', () => {
    const audio = makeFlat(8000, 2, 0.8, 2)
    const out = applyFade(audio, 0.5, 0.5, 'linear')
    expect(out.channels.length).toBe(2)
    expect(out.channels[1]![0]).toBe(0)
    expect(out.channels[1]![15999]).toBe(0)
    expect(audio.channels[0]![0]).toBeCloseTo(0.8, 6)
  })

  it('淡入+淡出恰好等于总时长时允许', () => {
    const audio = makeFlat(8000, 2, 0.8)
    const out = applyFade(audio, 1, 1, 'linear')
    expect(out.channels[0]![0]).toBe(0)
    expect(out.channels[0]![15999]).toBe(0)
  })

  it('淡入+淡出超过总时长抛中文错', () => {
    const audio = makeFlat(8000, 2, 0.8)
    expect(() => applyFade(audio, 1.5, 1, 'linear')).toThrow(/超过音频时长/)
    expect(() => applyFade(audio, 1, 1.5, 'linear')).toThrow(/超过音频时长/)
  })

  it('非法时长抛中文错', () => {
    const audio = makeFlat(8000, 2, 0.8)
    expect(() => applyFade(audio, -1, 0, 'linear')).toThrow(/淡入时长非法/)
    expect(() => applyFade(audio, 0, -1, 'linear')).toThrow(/淡出时长非法/)
    expect(() => applyFade(audio, Number.NaN, 0, 'linear')).toThrow(/淡入时长非法/)
    expect(() => applyFade(audio, 0, MAX_FADE_SEC + 1, 'linear')).toThrow(/淡出时长非法/)
    expect(() => applyFade(audio, MAX_FADE_SEC + 1, 0, 'linear')).toThrow(/淡入时长非法/)
  })

  it('空音频 / 非法采样率 / 非法曲线抛中文错', () => {
    expect(() =>
      applyFade({ sampleRate: 8000, channels: [new Float32Array(0)] }, 0.1, 0.1, 'linear'),
    ).toThrow(/音频为空/)
    expect(() =>
      applyFade({ sampleRate: 999, channels: [new Float32Array(8)] }, 0, 0, 'linear'),
    ).toThrow(/采样率非法/)
    expect(() => applyFade(makeFlat(), 0, 0, 'cosine' as never)).toThrow(/淡入淡出曲线非法/)
  })
})

describe('audio-fade / 杂项', () => {
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

  it('encodeWavPcm 钳制超范围采样', () => {
    const wav = encodeWavPcm({ sampleRate: 8000, channels: [new Float32Array([-2, 2, 0.5])] })
    const view = new DataView(wav.buffer)
    expect(view.getInt16(44, true)).toBe(-32767)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(Math.round(0.5 * 32767))
  })

  it('fadeFileName', () => {
    expect(fadeFileName('song.mp3')).toBe('song-fade.wav')
    expect(fadeFileName('a.b.ogg')).toBe('a.b-fade.wav')
    expect(fadeFileName('noext')).toBe('noext-fade.wav')
    expect(fadeFileName('.mp3')).toBe('audio-fade.wav')
  })
})
