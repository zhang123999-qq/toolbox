import { describe, expect, it } from 'vitest'
import {
  CONVERT_FORMATS,
  MAX_BITRATE_KBPS,
  MAX_SAMPLE_RATE,
  MIN_BITRATE_KBPS,
  MIN_SAMPLE_RATE,
  assertValidChannels,
  assertValidSampleRate,
  buildConvertArgs,
  convertFileName,
  convertMimeType,
  decodeWavPcm,
  durationSec,
  encodeWavPcm,
  formatBytes,
  formatSeconds,
  makeSineTone,
  validateBitrateKbps,
  validateConvertFormat,
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

describe('audio-convert / 参数校验', () => {
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

describe('audio-convert / WAV 编解码', () => {
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

describe('audio-convert / 测试音生成', () => {
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

describe('audio-convert / 格式与比特率校验', () => {
  it('支持的格式通过白名单', () => {
    expect(CONVERT_FORMATS).toEqual(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'])
    for (const f of CONVERT_FORMATS) expect(() => validateConvertFormat(f)).not.toThrow()
  })

  it('不支持的格式抛中文错', () => {
    expect(() => validateConvertFormat('wma')).toThrow(/不支持的输出格式/)
    expect(() => validateConvertFormat('')).toThrow(/不支持的输出格式/)
  })

  it('比特率区间 32～512', () => {
    expect(() => validateBitrateKbps(128)).not.toThrow()
    expect(() => validateBitrateKbps(MIN_BITRATE_KBPS)).not.toThrow()
    expect(() => validateBitrateKbps(MAX_BITRATE_KBPS)).not.toThrow()
    for (const bad of [31, 513, 128.5, Number.NaN]) {
      expect(() => validateBitrateKbps(bad)).toThrow(/比特率非法/)
    }
  })
})

describe('audio-convert / 文件名与参数组装', () => {
  it('输出文件名替换扩展名', () => {
    expect(convertFileName('song.wav', 'mp3')).toBe('song.mp3')
    expect(convertFileName('a.b.flac', 'ogg')).toBe('a.b.ogg')
    expect(convertFileName('noext', 'wav')).toBe('noext.wav')
    expect(convertFileName('.mp3', 'm4a')).toBe('audio.m4a')
    expect(() => convertFileName('x.wav', 'wma')).toThrow(/不支持的输出格式/)
  })

  it('mp3 参数：libmp3lame + 比特率', () => {
    expect(buildConvertArgs('in.wav', 'out.mp3', 'mp3', 128)).toEqual([
      '-i',
      'in.wav',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '128k',
      'out.mp3',
    ])
  })

  it('m4a / aac 共用 aac 编码器', () => {
    expect(buildConvertArgs('in.wav', 'out.m4a', 'm4a', 192)).toEqual([
      '-i',
      'in.wav',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      'out.m4a',
    ])
    expect(buildConvertArgs('in.wav', 'out.aac', 'aac', 192)).toContain('aac')
  })

  it('ogg 用 libvorbis', () => {
    expect(buildConvertArgs('in.wav', 'out.ogg', 'ogg', 96)).toEqual([
      '-i',
      'in.wav',
      '-c:a',
      'libvorbis',
      '-b:a',
      '96k',
      'out.ogg',
    ])
  })

  it('wav 用 pcm_s16le，不带比特率', () => {
    expect(buildConvertArgs('in.mp3', 'out.wav', 'wav', 128)).toEqual([
      '-i',
      'in.mp3',
      '-c:a',
      'pcm_s16le',
      'out.wav',
    ])
  })

  it('flac 无损，不带比特率', () => {
    expect(buildConvertArgs('in.mp3', 'out.flac', 'flac', 320)).toEqual([
      '-i',
      'in.mp3',
      '-c:a',
      'flac',
      'out.flac',
    ])
  })

  it('比特率非法时组装抛错', () => {
    expect(() => buildConvertArgs('in.wav', 'out.mp3', 'mp3', 8)).toThrow(/比特率非法/)
  })
})

describe('audio-convert / MIME', () => {
  it('各格式 MIME 正确', () => {
    expect(convertMimeType('mp3')).toBe('audio/mpeg')
    expect(convertMimeType('wav')).toBe('audio/wav')
    expect(convertMimeType('ogg')).toBe('audio/ogg')
    expect(convertMimeType('m4a')).toBe('audio/mp4')
    expect(convertMimeType('flac')).toBe('audio/flac')
    expect(convertMimeType('aac')).toBe('audio/aac')
  })
})
