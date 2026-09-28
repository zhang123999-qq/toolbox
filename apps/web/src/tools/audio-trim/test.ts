import { describe, expect, it } from 'vitest'
import {
  MAX_SILENCE_SEC,
  MAX_THRESHOLD_DB,
  MIN_SILENCE_SEC,
  MIN_THRESHOLD_DB,
  assertValidChannels,
  assertValidMinSilenceSec,
  assertValidSampleRate,
  assertValidThresholdDb,
  detectSilence,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  makeSineTone,
  makeToneWithSilence,
  trimFileName,
  trimSilence,
} from './utils'

describe('audio-trim / 参数校验', () => {
  it('合法采样率 / 声道通过', () => {
    expect(() => assertValidSampleRate(44100)).not.toThrow()
    expect(() => assertValidChannels([new Float32Array(8)])).not.toThrow()
  })

  it('采样率 / 声道非法抛中文错', () => {
    expect(() => assertValidSampleRate(999)).toThrow(/采样率非法/)
    expect(() => assertValidChannels([])).toThrow(/至少需要 1 个声道/)
    expect(() => assertValidChannels([new Float32Array(8), new Float32Array(4)])).toThrow(
      /声道长度不一致/,
    )
  })

  it('静音阈值范围校验', () => {
    expect(() => assertValidThresholdDb(MIN_THRESHOLD_DB)).not.toThrow()
    expect(() => assertValidThresholdDb(MAX_THRESHOLD_DB)).not.toThrow()
    expect(() => assertValidThresholdDb(-40)).not.toThrow()
    for (const bad of [-91, -9, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertValidThresholdDb(bad)).toThrow(/静音阈值非法/)
    }
  })

  it('最小时长范围校验', () => {
    expect(() => assertValidMinSilenceSec(MIN_SILENCE_SEC)).not.toThrow()
    expect(() => assertValidMinSilenceSec(MAX_SILENCE_SEC)).not.toThrow()
    for (const bad of [0.04, 10.1, -1, Number.NaN]) {
      expect(() => assertValidMinSilenceSec(bad)).toThrow(/最小时长非法/)
    }
  })

  it('formatSeconds / formatBytes / durationSec', () => {
    expect(formatSeconds(1.236)).toBe('1.24 秒')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
    expect(durationSec(makeSineTone(8000, 2, 440))).toBe(2)
  })
})

describe('audio-trim / 测试音生成', () => {
  it('makeToneWithSilence 拼出静音+正弦+静音', () => {
    const audio = makeToneWithSilence(8000, 0.5, 1, 0.25)
    expect(audio.channels[0]!.length).toBe(8000 + 4000 + 2000)
    expect(audio.channels[0]![0]).toBe(0)
    expect(audio.channels[0]![3999]).toBe(0)
    // 正弦波起始相位为 0，取远离过零点的采样点断言非零
    expect(audio.channels[0]![4005]).not.toBe(0)
    expect(audio.channels[0]![11999]).not.toBe(0)
    expect(audio.channels[0]![12000]).toBe(0)
  })

  it('立体声各声道同步拼接', () => {
    const audio = makeToneWithSilence(8000, 0.1, 0.2, 0.1, 440, 2)
    expect(audio.channels.length).toBe(2)
    expect(audio.channels[1]![0]).toBe(0)
  })

  it('非法参数抛中文错', () => {
    expect(() => makeToneWithSilence(999, 0.5, 1, 0.5)).toThrow(/采样率非法/)
    expect(() => makeToneWithSilence(8000, -1, 1, 0.5)).toThrow(/前导静音时长非法/)
    expect(() => makeToneWithSilence(8000, Number.NaN, 1, 0.5)).toThrow(/前导静音时长非法/)
    expect(() => makeToneWithSilence(8000, 0.5, 1, -1)).toThrow(/尾部静音时长非法/)
    expect(() => makeToneWithSilence(8000, 0.5, 0, 0.5)).toThrow(/时长非法/)
    expect(() => makeToneWithSilence(8000, 0.5, 1, 0.5, 0)).toThrow(/频率非法/)
  })

  it('makeSineTone 非法参数抛中文错', () => {
    expect(() => makeSineTone(8000, 0, 440)).toThrow(/时长非法/)
    expect(() => makeSineTone(8000, 1, -3)).toThrow(/频率非法/)
    expect(() => makeSineTone(8000, 1, 440, 9)).toThrow(/声道数非法/)
  })

  it('encodeWavPcm 编码长度正确，超范围采样被钳制', () => {
    const wav = encodeWavPcm(makeSineTone(8000, 1, 440))
    expect(wav.length).toBe(44 + 8000 * 2)
    const clipped = encodeWavPcm({ sampleRate: 8000, channels: [new Float32Array([-2, 2, 0.5])] })
    const view = new DataView(clipped.buffer)
    expect(view.getInt16(44, true)).toBe(-32767)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(Math.round(0.5 * 32767))
  })
})

describe('audio-trim / 静音检测', () => {
  it('检测出首尾静音时长', () => {
    const audio = makeToneWithSilence(8000, 1, 2, 0.5)
    const { leadingSec, trailingSec } = detectSilence(audio, -40)
    expect(leadingSec).toBeCloseTo(1, 2)
    expect(trailingSec).toBeCloseTo(0.5, 2)
  })

  it('无静音时两端都为 0', () => {
    const audio = makeSineTone(8000, 1, 440)
    const { leadingSec, trailingSec } = detectSilence(audio, -40)
    expect(leadingSec).toBe(0)
    expect(trailingSec).toBe(0)
  })

  it('仅首部有静音时尾部为 0', () => {
    const audio = makeToneWithSilence(8000, 0.5, 1, 0)
    const { leadingSec, trailingSec } = detectSilence(audio, -40)
    expect(leadingSec).toBeCloseTo(0.5, 2)
    expect(trailingSec).toBe(0)
  })

  it('阈值两侧判定正确：高于阈值不算静音，低于阈值算静音', () => {
    // 幅度 0.02 → 约 -34 dB，高于阈值 -40，不判静音
    const loud = { sampleRate: 8000, channels: [new Float32Array(8000).fill(0.02)] }
    expect(detectSilence(loud, -40).leadingSec).toBe(0)
    // 幅度 0.005 → 约 -46 dB，低于阈值 -40，判为静音
    const quiet = { sampleRate: 8000, channels: [new Float32Array(8000).fill(0.005)] }
    expect(detectSilence(quiet, -40).leadingSec).toBeCloseTo(1, 2)
  })

  it('立体声：任一声道有声就不算静音', () => {
    const audio = makeToneWithSilence(8000, 0.5, 1, 0.5, 440, 2)
    audio.channels[1]!.fill(0.5)
    const { leadingSec, trailingSec } = detectSilence(audio, -40)
    expect(leadingSec).toBe(0)
    expect(trailingSec).toBe(0)
  })

  it('空音频 / 非法参数抛中文错', () => {
    expect(() => detectSilence({ sampleRate: 8000, channels: [new Float32Array(0)] }, -40)).toThrow(
      /音频为空/,
    )
    expect(() => detectSilence(makeSineTone(8000, 1, 440), -5)).toThrow(/静音阈值非法/)
    expect(() => detectSilence({ sampleRate: 999, channels: [new Float32Array(8)] }, -40)).toThrow(
      /采样率非法/,
    )
  })
})

describe('audio-trim / 去静音', () => {
  it('裁掉达到最小时长的首尾静音，不修改原音频', () => {
    const audio = makeToneWithSilence(8000, 1, 2, 0.5)
    const r = trimSilence(audio, -40, 0.3)
    expect(r.leadingDetectedSec).toBeCloseTo(1, 2)
    expect(r.trailingDetectedSec).toBeCloseTo(0.5, 2)
    expect(r.leadingRemovedSec).toBeCloseTo(1, 2)
    expect(r.trailingRemovedSec).toBeCloseTo(0.5, 2)
    expect(durationSec(r.audio)).toBeCloseTo(2, 2)
    expect(audio.channels[0]!.length).toBe(28000)
  })

  it('未达最小时长的静音段被保留', () => {
    const audio = makeToneWithSilence(8000, 0.2, 2, 0.2)
    const r = trimSilence(audio, -40, 0.5)
    expect(r.leadingDetectedSec).toBeCloseTo(0.2, 2)
    expect(r.leadingRemovedSec).toBe(0)
    expect(r.trailingRemovedSec).toBe(0)
    expect(durationSec(r.audio)).toBeCloseTo(2.4, 2)
  })

  it('恰好等于最小时长的静音段被裁掉', () => {
    const audio = makeToneWithSilence(8000, 0.5, 2, 0)
    const r = trimSilence(audio, -40, 0.5)
    expect(r.leadingRemovedSec).toBeGreaterThan(0)
    expect(durationSec(r.audio)).toBeCloseTo(2, 2)
  })

  it('无静音时原样返回', () => {
    const audio = makeSineTone(8000, 1, 440)
    const r = trimSilence(audio, -40, 0.3)
    expect(r.leadingRemovedSec).toBe(0)
    expect(r.trailingRemovedSec).toBe(0)
    expect(r.audio.channels[0]!.length).toBe(8000)
  })

  it('全静音抛中文错', () => {
    const silent = { sampleRate: 8000, channels: [new Float32Array(8000)] }
    expect(() => trimSilence(silent, -40, 0.3)).toThrow(/音频全部为静音/)
  })

  it('最小时长非法抛中文错', () => {
    const audio = makeSineTone(8000, 1, 440)
    expect(() => trimSilence(audio, -40, 0.01)).toThrow(/最小时长非法/)
    expect(() => trimSilence(audio, -40, Number.NaN)).toThrow(/最小时长非法/)
  })
})

describe('audio-trim / 文件名', () => {
  it('原名去扩展名后加 -trimmed.wav', () => {
    expect(trimFileName('song.mp3')).toBe('song-trimmed.wav')
    expect(trimFileName('a.b.ogg')).toBe('a.b-trimmed.wav')
    expect(trimFileName('noext')).toBe('noext-trimmed.wav')
    expect(trimFileName('.mp3')).toBe('audio-trimmed.wav')
  })
})
