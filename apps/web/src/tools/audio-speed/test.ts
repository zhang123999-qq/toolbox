import { describe, expect, it } from 'vitest'
import {
  MAX_SAMPLE_RATE,
  MAX_SPEED_RATE,
  MIN_SAMPLE_RATE,
  MIN_SPEED_RATE,
  assertValidChannels,
  assertValidSampleRate,
  changeSpeed,
  decodeWavPcm,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  makeSineTone,
  resampleLinear,
  speedFileName,
  validateSpeedRate,
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

describe('audio-speed / 参数校验', () => {
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

describe('audio-speed / WAV 编解码', () => {
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

describe('audio-speed / 测试音生成', () => {
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

describe('audio-speed / 倍率校验', () => {
  it('0.25～4 合法', () => {
    expect(MIN_SPEED_RATE).toBe(0.25)
    expect(MAX_SPEED_RATE).toBe(4)
    expect(() => validateSpeedRate(1)).not.toThrow()
    expect(() => validateSpeedRate(0.25)).not.toThrow()
    expect(() => validateSpeedRate(4)).not.toThrow()
    for (const bad of [0.24, 4.1, 0, -1, Number.NaN]) {
      expect(() => validateSpeedRate(bad)).toThrow(/变速倍率非法/)
    }
  })
})

describe('audio-speed / 重采样', () => {
  it('2 倍速：长度减半，隔点采样', () => {
    const ch = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7])
    expect([...resampleLinear(ch, 2)]).toEqual([0, 2, 4, 6])
  })

  it('0.5 倍速：长度加倍，线性插值', () => {
    const ch = new Float32Array([0, 2, 4])
    expect([...resampleLinear(ch, 0.5)]).toEqual([0, 1, 2, 3, 4, 4])
  })

  it('末尾越界时复用最后一个采样', () => {
    const ch = new Float32Array(10).fill(1)
    const out = resampleLinear(ch, 0.25)
    expect(out.length).toBe(40)
    expect(out[39]).toBe(1)
  })

  it('changeSpeed 各声道同步，时长按倍率变化', () => {
    const tone = makeSineTone(8000, 2, 440, 2)
    const fast = changeSpeed(tone, 2)
    expect(durationSec(fast)).toBeCloseTo(1, 9)
    expect(fast.channels.length).toBe(2)
    const slow = changeSpeed(tone, 0.5)
    expect(durationSec(slow)).toBeCloseTo(4, 9)
  })

  it('采样率非法时抛错', () => {
    const bad = { sampleRate: 999, channels: [new Float32Array(10)] }
    expect(() => changeSpeed(bad, 2)).toThrow(/采样率非法/)
  })
})

describe('audio-speed / 文件名', () => {
  it('文件名带倍率', () => {
    expect(speedFileName('song.wav', 2)).toBe('song-2x.wav')
    expect(speedFileName('song.wav', 0.5)).toBe('song-0.5x.wav')
    expect(speedFileName('.wav', 2)).toBe('audio-2x.wav')
    expect(() => speedFileName('x.wav', 10)).toThrow(/变速倍率非法/)
  })
})
