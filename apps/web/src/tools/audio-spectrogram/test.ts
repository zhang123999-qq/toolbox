import { describe, expect, it } from 'vitest'
import {
  DB_FLOOR,
  MAX_SAMPLE_RATE,
  MIN_SAMPLE_RATE,
  assertValidChannels,
  assertValidOverlapPct,
  assertValidSampleRate,
  assertValidWindowSize,
  computeSpectrogram,
  dbToNorm,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  magnitudeToDb,
  makeSineTone,
  mixDownToMono,
  normToRgb,
  spectrogramFileName,
  windowGain,
} from './utils'

describe('audio-spectrogram / 参数校验', () => {
  it('合法采样率通过', () => {
    expect(() => assertValidSampleRate(44100)).not.toThrow()
    expect(() => assertValidSampleRate(MIN_SAMPLE_RATE)).not.toThrow()
    expect(() => assertValidSampleRate(MAX_SAMPLE_RATE)).not.toThrow()
  })

  it('采样率非法抛中文错', () => {
    for (const bad of [44100.5, 999, 192001, Number.NaN, -8000]) {
      expect(() => assertValidSampleRate(bad)).toThrow(/采样率非法/)
    }
  })

  it('声道校验', () => {
    expect(() => assertValidChannels([])).toThrow(/至少需要 1 个声道/)
    expect(() => assertValidChannels([new Float32Array(8), new Float32Array(4)])).toThrow(
      /声道长度不一致/,
    )
    expect(() => assertValidChannels([new Float32Array(8)])).not.toThrow()
  })

  it('窗长白名单校验', () => {
    for (const ok of [256, 512, 1024, 2048]) expect(() => assertValidWindowSize(ok)).not.toThrow()
    for (const bad of [100, 300, 4096, 512.5, Number.NaN]) {
      expect(() => assertValidWindowSize(bad)).toThrow(/窗长非法/)
    }
  })

  it('重叠率白名单校验', () => {
    for (const ok of [0, 25, 50, 75]) expect(() => assertValidOverlapPct(ok)).not.toThrow()
    for (const bad of [10, 60, 100, -25, Number.NaN]) {
      expect(() => assertValidOverlapPct(bad)).toThrow(/重叠率非法/)
    }
  })

  it('formatSeconds / formatBytes / durationSec', () => {
    expect(formatSeconds(1.236)).toBe('1.24 秒')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
    // 精确原时长：采样点数 / 采样率（不经过 STFT 帧步长换算）
    expect(durationSec(makeSineTone(44100, 2, 440))).toBe(2)
    expect(durationSec(makeSineTone(8000, 0.5, 440))).toBe(0.5)
  })
})

describe('audio-spectrogram / WAV 编码与测试音', () => {
  it('编码头为 RIFF/WAVE，长度正确', () => {
    const tone = makeSineTone(8000, 1, 440)
    const wav = encodeWavPcm(tone)
    expect(wav.length).toBe(44 + 8000 * 2)
    const tag = (off: number) =>
      String.fromCharCode(wav[off]!, wav[off + 1]!, wav[off + 2]!, wav[off + 3]!)
    expect(tag(0)).toBe('RIFF')
    expect(tag(8)).toBe('WAVE')
  })

  it('超范围采样被钳制', () => {
    const wav = encodeWavPcm({ sampleRate: 8000, channels: [new Float32Array([-2, 2])] })
    const view = new DataView(wav.buffer)
    expect(view.getInt16(44, true)).toBe(-32767)
    expect(view.getInt16(46, true)).toBe(32767)
  })

  it('makeSineTone 非法参数抛中文错', () => {
    expect(() => makeSineTone(999, 1, 440)).toThrow(/采样率非法/)
    expect(() => makeSineTone(8000, 0, 440)).toThrow(/时长非法/)
    expect(() => makeSineTone(8000, Number.NaN, 440)).toThrow(/时长非法/)
    expect(() => makeSineTone(8000, 1, 0)).toThrow(/频率非法/)
    expect(() => makeSineTone(8000, 1, 440, 0)).toThrow(/声道数非法/)
    expect(() => makeSineTone(8000, 1, 440, 9)).toThrow(/声道数非法/)
    expect(() => makeSineTone(8000, 1, 440, 1.5)).toThrow(/声道数非法/)
  })
})

describe('audio-spectrogram / 窗函数', () => {
  it('hann 窗两端为 0、中间为 1', () => {
    expect(windowGain('hann', 0, 256)).toBe(0)
    expect(windowGain('hann', 255, 256)).toBeCloseTo(0, 12)
    expect(windowGain('hann', 127.5, 256)).toBeCloseTo(1, 12)
  })

  it('hamming 窗两端为 0.08', () => {
    expect(windowGain('hamming', 0, 256)).toBeCloseTo(0.08, 12)
    expect(windowGain('hamming', 255, 256)).toBeCloseTo(0.08, 12)
  })
})

describe('audio-spectrogram / STFT', () => {
  it('440Hz 正弦波的能量峰落在正确频点', () => {
    const tone = makeSineTone(8000, 1, 440)
    const spec = computeSpectrogram(tone.channels[0]!, 8000, 256, 50)
    // 频率分辨率 8000/256 = 31.25Hz，440Hz ≈ 第 14 个频点
    expect(spec.freqStepHz).toBeCloseTo(31.25, 9)
    expect(spec.hopSize).toBe(128)
    expect(spec.frameStepSec).toBeCloseTo(0.016, 9)
    expect(spec.frames.length).toBe(Math.floor((8000 - 256) / 128) + 1)
    expect(spec.frames[0]!.length).toBe(128)
    let peak = 0
    for (let k = 1; k < 128; k++) {
      if (spec.frames[0]![k]! > spec.frames[0]![peak]!) peak = k
    }
    expect(peak).toBe(14)
  })

  it('FFT 结果与测试内手写的朴素 DFT 交叉验证一致', () => {
    const n = 256
    const sig = new Float32Array(n)
    for (let t = 0; t < n; t++) {
      sig[t] = Math.sin((2 * Math.PI * 7 * t) / n) + 0.5 * Math.cos((2 * Math.PI * 40 * t) / n)
    }
    const spec = computeSpectrogram(sig, 8000, 256, 0)
    expect(spec.frames.length).toBe(1)
    const frame = spec.frames[0]!
    for (let k = 0; k < n / 2; k++) {
      let re = 0
      let im = 0
      for (let t = 0; t < n; t++) {
        const w = windowGain('hann', t, n)
        const angle = (2 * Math.PI * k * t) / n
        re += sig[t]! * w * Math.cos(angle)
        im -= sig[t]! * w * Math.sin(angle)
      }
      expect(frame[k]).toBeCloseTo(Math.sqrt(re * re + im * im) / n, 4)
    }
  })

  it('重叠率 0 / 75 改变跳步与帧数', () => {
    const tone = makeSineTone(8000, 1, 440)
    const s0 = computeSpectrogram(tone.channels[0]!, 8000, 256, 0)
    const s75 = computeSpectrogram(tone.channels[0]!, 8000, 256, 75)
    expect(s0.hopSize).toBe(256)
    expect(s75.hopSize).toBe(64)
    expect(s75.frames.length).toBeGreaterThan(s0.frames.length)
  })

  it('hamming 窗可用', () => {
    const tone = makeSineTone(8000, 0.5, 440)
    const spec = computeSpectrogram(tone.channels[0]!, 8000, 256, 50, 'hamming')
    expect(spec.frames.length).toBeGreaterThan(0)
  })

  it('信号长度恰好等于窗长时得到 1 帧', () => {
    const spec = computeSpectrogram(new Float32Array(256).fill(0.5), 8000, 256, 0)
    expect(spec.frames.length).toBe(1)
  })

  it('空信号 / 过短信号 / 非法参数抛中文错', () => {
    expect(() => computeSpectrogram(new Float32Array(0), 8000, 256, 50)).toThrow(/音频为空/)
    expect(() => computeSpectrogram(new Float32Array(100), 8000, 256, 50)).toThrow(/音频太短/)
    expect(() => computeSpectrogram(new Float32Array(300), 999, 256, 50)).toThrow(/采样率非法/)
    expect(() => computeSpectrogram(new Float32Array(300), 8000, 100, 50)).toThrow(/窗长非法/)
    expect(() => computeSpectrogram(new Float32Array(300), 8000, 256, 60)).toThrow(/重叠率非法/)
  })
})

describe('audio-spectrogram / 单声道混音', () => {
  it('立体声取平均', () => {
    const audio = {
      sampleRate: 8000,
      channels: [new Float32Array([1, 1]), new Float32Array([-1, -1])],
    }
    const mono = mixDownToMono(audio)
    expect(mono.length).toBe(2)
    expect(mono[0]).toBe(0)
    expect(mono[1]).toBe(0)
  })

  it('单声道原样返回', () => {
    const audio = { sampleRate: 8000, channels: [new Float32Array([0.5, -0.25])] }
    const mono = mixDownToMono(audio)
    expect(Array.from(mono)).toEqual([0.5, -0.25])
  })

  it('非法采样率 / 声道抛错', () => {
    expect(() => mixDownToMono({ sampleRate: 999, channels: [new Float32Array(4)] })).toThrow(
      /采样率非法/,
    )
    expect(() => mixDownToMono({ sampleRate: 8000, channels: [] })).toThrow(/至少需要 1 个声道/)
  })
})

describe('audio-spectrogram / dB 与伪彩色', () => {
  it('magnitudeToDb 换算', () => {
    expect(magnitudeToDb(1, 1)).toBe(0)
    expect(magnitudeToDb(0.1, 1)).toBeCloseTo(-20, 9)
    expect(magnitudeToDb(0, 1)).toBe(DB_FLOOR)
    expect(magnitudeToDb(-0.5, 1)).toBe(DB_FLOOR)
    expect(() => magnitudeToDb(1, 0)).toThrow(/最大幅度非法/)
    expect(() => magnitudeToDb(1, -2)).toThrow(/最大幅度非法/)
    expect(() => magnitudeToDb(1, Number.NaN)).toThrow(/最大幅度非法/)
  })

  it('dbToNorm 映射与钳制', () => {
    expect(dbToNorm(0)).toBe(1)
    expect(dbToNorm(3)).toBe(1)
    expect(dbToNorm(DB_FLOOR)).toBe(0)
    expect(dbToNorm(-120)).toBe(0)
    expect(dbToNorm(-45)).toBeCloseTo(0.5, 9)
    expect(dbToNorm(-30, -60)).toBeCloseTo(0.5, 9)
    expect(() => dbToNorm(-10, 0)).toThrow(/dB 下限非法/)
    expect(() => dbToNorm(-10, 6)).toThrow(/dB 下限非法/)
  })

  it('normToRgb 三段渐变', () => {
    expect(normToRgb(0)).toEqual([0, 0, 128])
    expect(normToRgb(0.25)).toEqual([0, 128, 192])
    expect(normToRgb(0.5)).toEqual([0, 255, 255])
    expect(normToRgb(0.75)).toEqual([128, 255, 128])
    expect(normToRgb(1)).toEqual([255, 255, 0])
    expect(normToRgb(-0.5)).toEqual([0, 0, 128])
    expect(normToRgb(1.5)).toEqual([255, 255, 0])
  })
})

describe('audio-spectrogram / 文件名', () => {
  it('原名去扩展名后加 -spectrogram.png', () => {
    expect(spectrogramFileName('song.mp3')).toBe('song-spectrogram.png')
    expect(spectrogramFileName('a.b.c.ogg')).toBe('a.b.c-spectrogram.png')
    expect(spectrogramFileName('noext')).toBe('noext-spectrogram.png')
    expect(spectrogramFileName('.mp3')).toBe('audio-spectrogram.png')
  })
})
