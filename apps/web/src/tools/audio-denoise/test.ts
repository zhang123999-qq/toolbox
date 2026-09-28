import { describe, expect, it } from 'vitest'
import {
  DENOISE_METHODS,
  MAX_SAMPLE_RATE,
  MIN_SAMPLE_RATE,
  assertValidChannels,
  assertValidSampleRate,
  decodeWavPcm,
  denoiseAudio,
  denoiseFileName,
  durationSec,
  encodeWavPcm,
  fft,
  formatBytes,
  formatSeconds,
  hannWindow,
  makeSineTone,
  resolveDenoiseOptions,
  validateDenoiseMethod,
} from './utils'
/** 手工拼最小 WAV：RIFF + 可选 JUNK + fmt + data（用于解码器的异常分支） */
function craftWav(opts: {
  audioFormat?: number
  bitsPerSample?: number
  numChannels?: number
  sampleRate?: number
  dataSize?: number
  withFmt?: boolean
  withData?: boolean
  withJunk?: boolean
}): Uint8Array {
  const {
    audioFormat = 1,
    bitsPerSample = 16,
    numChannels = 1,
    sampleRate = 44100,
    dataSize = 8,
    withFmt = true,
    withData = true,
    withJunk = false,
  } = opts
  const chunks: Uint8Array[] = []
  const tag = (buf: Uint8Array, off: number, text: string) => {
    for (let i = 0; i < text.length; i++) buf[off + i] = text.charCodeAt(i)
  }
  if (withJunk) {
    const junk = new Uint8Array(12)
    const v = new DataView(junk.buffer)
    tag(junk, 0, 'JUNK')
    v.setUint32(4, 4, true)
    chunks.push(junk)
  }
  if (withFmt) {
    const fmt = new Uint8Array(24)
    const v = new DataView(fmt.buffer)
    tag(fmt, 0, 'fmt ')
    v.setUint32(4, 16, true)
    v.setUint16(8, audioFormat, true)
    v.setUint16(10, numChannels, true)
    v.setUint32(12, sampleRate, true)
    v.setUint32(16, Math.floor((sampleRate * numChannels * bitsPerSample) / 8), true)
    v.setUint16(20, Math.floor((numChannels * bitsPerSample) / 8), true)
    v.setUint16(22, bitsPerSample, true)
    chunks.push(fmt)
  }
  if (withData) {
    const data = new Uint8Array(8 + dataSize)
    tag(data, 0, 'data')
    new DataView(data.buffer).setUint32(4, dataSize, true)
    chunks.push(data)
  }
  const bodyLen = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(12 + bodyLen)
  tag(out, 0, 'RIFF')
  new DataView(out.buffer).setUint32(4, 4 + bodyLen, true)
  tag(out, 8, 'WAVE')
  let off = 12
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

describe('audio-denoise / 参数校验', () => {
  it('合法采样率通过', () => {
    expect(() => assertValidSampleRate(44100)).not.toThrow()
    expect(() => assertValidSampleRate(MIN_SAMPLE_RATE)).not.toThrow()
    expect(() => assertValidSampleRate(MAX_SAMPLE_RATE)).not.toThrow()
  })

  it('采样率非法抛中文错：非整数 / 过小 / 过大 / NaN', () => {
    for (const bad of [44100.5, 999, 192001, Number.NaN, -44100]) {
      expect(() => assertValidSampleRate(bad)).toThrow(/采样率非法/)
    }
  })

  it('声道校验：空声道与长度不一致抛中文错', () => {
    expect(() => assertValidChannels([])).toThrow(/至少需要 1 个声道/)
    expect(() => assertValidChannels([new Float32Array(10), new Float32Array(8)])).toThrow(
      /声道长度不一致/,
    )
    expect(() => assertValidChannels([new Float32Array(10), new Float32Array(10)])).not.toThrow()
  })

  it('durationSec 计算时长', () => {
    const tone = makeSineTone(8000, 2, 440)
    expect(durationSec(tone)).toBe(2)
  })

  it('formatSeconds / formatBytes 格式化', () => {
    expect(formatSeconds(1.234)).toBe('1.23 秒')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(2048)).toBe('2.00 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MiB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(() => formatBytes(Number.NaN)).toThrow(/字节数非法/)
  })
})

describe('audio-denoise / WAV 编解码', () => {
  it('编码后能解回：单声道往返误差小', () => {
    const tone = makeSineTone(44100, 1, 440)
    const back = decodeWavPcm(encodeWavPcm(tone))
    expect(back.sampleRate).toBe(44100)
    expect(back.channels.length).toBe(1)
    expect(back.channels[0]!.length).toBe(44100)
    for (let i = 0; i < 44100; i += 997) {
      expect(Math.abs(back.channels[0]![i]! - tone.channels[0]![i]!)).toBeLessThan(1 / 32767 + 1e-9)
    }
  })

  it('立体声往返：声道数与交错顺序正确', () => {
    const audio = makeSineTone(22050, 0.5, 330, 2)
    audio.channels[1]!.fill(0.25)
    const back = decodeWavPcm(encodeWavPcm(audio))
    expect(back.channels.length).toBe(2)
    expect(back.channels[1]![0]).toBeCloseTo(0.25, 4)
    expect(back.channels[0]![0]).toBeCloseTo(0, 4)
  })

  it('超范围采样被钳制到 [-1, 1]', () => {
    const audio = { sampleRate: 8000, channels: [new Float32Array([-2, 2, 0.5])] }
    const back = decodeWavPcm(encodeWavPcm(audio))
    expect(back.channels[0]![0]).toBeCloseTo(-1, 4)
    expect(back.channels[0]![1]).toBeCloseTo(1, 4)
    expect(back.channels[0]![2]).toBeCloseTo(0.5, 4)
  })

  it('32 位浮点 WAV 可解', () => {
    const wav = craftWav({ audioFormat: 3, bitsPerSample: 32, dataSize: 8 })
    const v = new DataView(wav.buffer)
    v.setFloat32(44, 0.5, true)
    v.setFloat32(48, -0.25, true)
    const back = decodeWavPcm(wav)
    expect(back.channels[0]![0]).toBeCloseTo(0.5, 6)
    expect(back.channels[0]![1]).toBeCloseTo(-0.25, 6)
  })

  it('JUNK 等扩展 chunk 被跳过', () => {
    const back = decodeWavPcm(craftWav({ withJunk: true }))
    expect(back.sampleRate).toBe(44100)
  })

  it('空 data 解出空声道，不抛错', () => {
    const back = decodeWavPcm(craftWav({ dataSize: 0 }))
    expect(back.channels[0]!.length).toBe(0)
  })

  it('非法 WAV 抛中文错', () => {
    expect(() => decodeWavPcm(new Uint8Array(10))).toThrow(/文件过短/)
    const badRiff = craftWav({})
    badRiff[0] = 'X'.charCodeAt(0)
    expect(() => decodeWavPcm(badRiff)).toThrow(/RIFF\/WAVE/)
    const badWave = craftWav({})
    badWave[8] = 'X'.charCodeAt(0)
    expect(() => decodeWavPcm(badWave)).toThrow(/RIFF\/WAVE/)
    expect(() => decodeWavPcm(craftWav({ withFmt: false, dataSize: 24 }))).toThrow(/缺少 fmt chunk/)
    expect(() => decodeWavPcm(craftWav({ withData: false, withJunk: true }))).toThrow(
      /缺少 data chunk/,
    )
    expect(() => decodeWavPcm(craftWav({ audioFormat: 2 }))).toThrow(/不支持的 WAV 编码格式/)
    expect(() => decodeWavPcm(craftWav({ bitsPerSample: 8 }))).toThrow(/不支持的位深/)
    expect(() => decodeWavPcm(craftWav({ audioFormat: 3, bitsPerSample: 16 }))).toThrow(
      /不支持的位深/,
    )
    expect(() => decodeWavPcm(craftWav({ numChannels: 0 }))).toThrow(/声道数非法/)
    expect(() => decodeWavPcm(craftWav({ numChannels: 33 }))).toThrow(/声道数非法/)
    const truncated = craftWav({ dataSize: 100 }).slice(0, 60)
    expect(() => decodeWavPcm(truncated)).toThrow(/超出文件范围/)
    const badRate = craftWav({ sampleRate: 999 })
    expect(() => decodeWavPcm(badRate)).toThrow(/采样率非法/)
  })
})

describe('audio-denoise / 测试音生成', () => {
  it('生成指定时长与频率的正弦波', () => {
    const tone = makeSineTone(8000, 1, 440, 2)
    expect(tone.channels.length).toBe(2)
    expect(tone.channels[0]!.length).toBe(8000)
    expect(Math.max(...tone.channels[0]!)).toBeLessThanOrEqual(0.5 + 1e-9)
  })

  it('非法参数抛中文错', () => {
    expect(() => makeSineTone(999, 1, 440)).toThrow(/采样率非法/)
    expect(() => makeSineTone(8000, 0, 440)).toThrow(/时长非法/)
    expect(() => makeSineTone(8000, Number.NaN, 440)).toThrow(/时长非法/)
    expect(() => makeSineTone(8000, 1, 0)).toThrow(/频率非法/)
    expect(() => makeSineTone(8000, 1, -5)).toThrow(/频率非法/)
    expect(() => makeSineTone(8000, 1, 440, 0)).toThrow(/声道数非法/)
    expect(() => makeSineTone(8000, 1, 440, 1.5)).toThrow(/声道数非法/)
    expect(() => makeSineTone(8000, 1, 440, 9)).toThrow(/声道数非法/)
  })
})

/** 确定性伪随机（LCG），保证单测稳定 */
function makeNoise(length: number, seed: number, amplitude: number): Float32Array {
  let s = seed
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out[i] = ((s / 0xffffffff) * 2 - 1) * amplitude
  }
  return out
}

function rms(data: Float32Array): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!
  return Math.sqrt(sum / data.length)
}

describe('audio-denoise / 选项校验', () => {
  it('方法白名单', () => {
    expect(DENOISE_METHODS).toEqual(['spectral', 'gate'])
    expect(() => validateDenoiseMethod('spectral')).not.toThrow()
    expect(() => validateDenoiseMethod('gate')).not.toThrow()
    expect(() => validateDenoiseMethod('foo')).toThrow(/降噪方法非法/)
  })

  it('默认值填充', () => {
    expect(resolveDenoiseOptions({ method: 'spectral' })).toEqual({
      method: 'spectral',
      calibrationSeconds: 0.5,
      oversubtraction: 2,
      spectralFloor: 0.1,
      thresholdDb: -40,
      gateAttenuation: 0.05,
    })
  })

  it('各参数非法抛中文错', () => {
    expect(() => resolveDenoiseOptions({ method: 'spectral', calibrationSeconds: 0 })).toThrow(
      /噪声校准时长非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'spectral', calibrationSeconds: 11 })).toThrow(
      /噪声校准时长非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'spectral', oversubtraction: 0.4 })).toThrow(
      /过减因子非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'spectral', oversubtraction: 11 })).toThrow(
      /过减因子非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'spectral', spectralFloor: -0.1 })).toThrow(
      /谱下限非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'spectral', spectralFloor: 1.5 })).toThrow(
      /谱下限非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'gate', thresholdDb: -81 })).toThrow(/门限非法/)
    expect(() => resolveDenoiseOptions({ method: 'gate', thresholdDb: 1 })).toThrow(/门限非法/)
    expect(() => resolveDenoiseOptions({ method: 'gate', gateAttenuation: -0.1 })).toThrow(
      /门衰减非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'gate', gateAttenuation: 1.5 })).toThrow(
      /门衰减非法/,
    )
    expect(() => resolveDenoiseOptions({ method: 'nope' as never })).toThrow(/降噪方法非法/)
  })
})

describe('audio-denoise / FFT', () => {
  it('冲激信号的频谱平坦', () => {
    const re = new Float32Array([1, 0, 0, 0, 0, 0, 0, 0])
    const im = new Float32Array(8)
    fft(re, im)
    for (let k = 0; k < 8; k++) expect(Math.hypot(re[k]!, im[k]!)).toBeCloseTo(1, 6)
  })

  it('FFT + IFFT 往返还原', () => {
    const src = new Float32Array([0.1, -0.2, 0.3, 0.4, -0.5, 0.6, 0.7, -0.8])
    const re = src.slice()
    const im = new Float32Array(8)
    fft(re, im)
    fft(re, im, true)
    for (let i = 0; i < 8; i++) {
      expect(re[i]).toBeCloseTo(src[i]!, 6)
      expect(im[i]).toBeCloseTo(0, 6)
    }
  })

  it('长度非法抛中文错', () => {
    expect(() => fft(new Float32Array(4), new Float32Array(3))).toThrow(/长度不一致/)
    expect(() => fft(new Float32Array(3), new Float32Array(3))).toThrow(/2 的幂/)
    expect(() => fft(new Float32Array(1), new Float32Array(1))).toThrow(/2 的幂/)
    expect(() => fft(new Float32Array(6), new Float32Array(6))).toThrow(/2 的幂/)
  })

  it('Hann 窗两端为 0、中间为 1', () => {
    const w = hannWindow(256)
    expect(w[0]).toBeCloseTo(0, 9)
    expect(w[128]).toBeCloseTo(1, 2)
    expect(w[255]).toBeCloseTo(0, 9)
    expect(() => hannWindow(100)).toThrow(/2 的幂/)
  })
})

describe('audio-denoise / 谱减法', () => {
  it('无噪声输入基本保留（开头留 0.5s 静音做校准）', () => {
    const sr = 8000
    const tone = makeSineTone(sr, 0.5, 440).channels[0]!
    const data = new Float32Array(sr)
    data.set(tone, sr / 2)
    const out = denoiseAudio({ sampleRate: sr, channels: [data] }, { method: 'spectral' }, 256)
    const inTone = data.slice(sr / 2)
    const outTone = out.channels[0]!.slice(sr / 2)
    expect(rms(outTone) / rms(inTone)).toBeGreaterThan(0.7)
    expect(rms(out.channels[0]!.slice(0, sr / 2))).toBeLessThan(0.01)
  })

  it('纯噪声被大幅衰减', () => {
    const sr = 8000
    const noise = makeNoise(sr, 12345, 0.3)
    const out = denoiseAudio(
      { sampleRate: sr, channels: [noise] },
      { method: 'spectral', calibrationSeconds: 0.5 },
      256,
    )
    expect(rms(out.channels[0]!) / rms(noise)).toBeLessThan(0.35)
  })

  it('空输入返回空拷贝，不抛错', () => {
    const empty = { sampleRate: 8000, channels: [new Float32Array(0)] }
    const out = denoiseAudio(empty, { method: 'spectral' }, 256)
    expect(out.channels[0]!.length).toBe(0)
    const out2 = denoiseAudio(empty, { method: 'gate' })
    expect(out2.channels[0]!.length).toBe(0)
  })

  it('frameSize 非 2 的幂时谱减法抛中文错（噪声门不受影响）', () => {
    const tone = makeSineTone(8000, 0.2, 440)
    expect(() => denoiseAudio(tone, { method: 'spectral' }, 100)).toThrow(/2 的幂/)
    expect(() => denoiseAudio(tone, { method: 'gate' }, 100)).not.toThrow()
  })
})

describe('audio-denoise / 噪声门', () => {
  it('响亮段通过、安静段被衰减', () => {
    const sr = 8000
    const tone = makeSineTone(sr, 0.5, 440).channels[0]!
    const data = new Float32Array(sr)
    data.set(tone, 0)
    const out = denoiseAudio({ sampleRate: sr, channels: [data] }, { method: 'gate' }, 256)
    const loud = out.channels[0]!.slice(0, sr / 2 - 320)
    const quiet = out.channels[0]!.slice(sr / 2 + 320)
    expect(rms(loud) / rms(tone)).toBeGreaterThan(0.9)
    expect(rms(quiet)).toBeLessThan(0.02)
  })

  it('门限以下的微弱噪声被压到接近 0', () => {
    const data = makeNoise(8000, 999, 0.001)
    const out = denoiseAudio(
      { sampleRate: 8000, channels: [data] },
      { method: 'gate', thresholdDb: -40 },
      256,
    )
    expect(rms(out.channels[0]!)).toBeLessThan(rms(data) * 0.2)
  })

  it('静→响过渡走 attack 包络：增益快速恢复', () => {
    const sr = 8000
    const data = new Float32Array(sr)
    data.set(makeSineTone(sr, 0.5, 440).channels[0]!, sr / 2)
    const out = denoiseAudio({ sampleRate: sr, channels: [data] }, { method: 'gate' }, 256)
    // 前半静音被压住，后半响亮段恢复
    expect(rms(out.channels[0]!.slice(0, sr / 2))).toBeLessThan(0.02)
    const lateTone = out.channels[0]!.slice(sr - 1600)
    const refTone = makeSineTone(sr, 0.5, 440).channels[0]!.slice(6400 - sr / 2)
    expect(rms(lateTone) / rms(refTone)).toBeGreaterThan(0.9)
  })
})

describe('audio-denoise / 文件名', () => {
  it('输出文件名', () => {
    expect(denoiseFileName('song.wav', 'spectral')).toBe('song-denoised.wav')
    expect(denoiseFileName('a.b.mp3', 'gate')).toBe('a.b-denoised.wav')
    expect(denoiseFileName('.wav', 'gate')).toBe('audio-denoised.wav')
    expect(() => denoiseFileName('x.wav', 'x' as never)).toThrow(/降噪方法非法/)
  })
})
