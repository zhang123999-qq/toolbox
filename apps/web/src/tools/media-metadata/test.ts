import { describe, expect, it } from 'vitest'
import {
  buildMetadataReport,
  detectMediaKind,
  formatBitrate,
  formatBytes,
  formatDuration,
  mediaKindLabel,
  parseMp3Info,
  parseMp4Info,
  parseWavInfo,
} from './utils'

/** 写 ASCII 标记 */
function tag(buf: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) buf[offset + i] = text.charCodeAt(i)
}

/** 最小 WAV 头：RIFF + fmt(16) + data */
function craftWav(
  sampleRate = 44100,
  channels = 2,
  bits = 16,
  dataSize = 44100 * 2 * 2,
): Uint8Array {
  const out = new Uint8Array(44 + dataSize)
  const v = new DataView(out.buffer)
  tag(out, 0, 'RIFF')
  v.setUint32(4, 36 + dataSize, true)
  tag(out, 8, 'WAVE')
  tag(out, 12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, channels, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, Math.floor((sampleRate * channels * bits) / 8), true)
  v.setUint16(32, Math.floor((channels * bits) / 8), true)
  v.setUint16(34, bits, true)
  tag(out, 36, 'data')
  v.setUint32(40, dataSize, true)
  return out
}

/** MP3 首帧头（MPEG1 Layer III 128kbps 44100Hz 立体声） */
function craftMp3Frame(withId3: boolean): Uint8Array {
  const frame = new Uint8Array([0xff, 0xfb, 0x90, 0x00])
  if (!withId3) return frame
  const out = new Uint8Array(10 + 4 + frame.length)
  tag(out, 0, 'ID3')
  out[3] = 3
  out[9] = 4 // 同步安全长度 = 4，标签体占 10..14，帧从 14 开始
  out.set(frame, 14)
  return out
}

/** 最小 MP4：ftyp + moov(mvhd + trak(tkhd))，支持往 moov/trak 里塞额外盒子 */
function craftMp4(
  opts: {
    mvhdVersion?: number
    timescale?: number
    duration?: number
    width?: number
    height?: number
    withTkhd?: boolean
    withMvhd?: boolean
    tkhdVersion?: number
    extraMvhd?: boolean
    extraTrak?: boolean
    moovTrailer?: Uint8Array
    trakTrailer?: Uint8Array
    /** 插在 trak 开头、tkhd 之前的盒子（测试 trak 内层循环用） */
    trakLead?: Uint8Array
  } = {},
): Uint8Array {
  const {
    mvhdVersion = 0,
    timescale = 1000,
    duration = 5000,
    width = 1280,
    height = 720,
    withTkhd = true,
    withMvhd = true,
    tkhdVersion = 0,
    extraMvhd = false,
    extraTrak = false,
    moovTrailer,
    trakTrailer,
    trakLead,
  } = opts
  const chunks: Uint8Array[] = []
  const box = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    new DataView(out.buffer).setUint32(0, out.length)
    tag(out, 4, type)
    out.set(body, 8)
    return out
  }
  const ftypBody = new Uint8Array(8)
  tag(ftypBody, 0, 'isom')
  chunks.push(box('ftyp', ftypBody))
  const mvhdBody = (): Uint8Array => {
    const mvhd = new Uint8Array(mvhdVersion === 0 ? 20 : 32)
    const v = new DataView(mvhd.buffer)
    v.setUint8(0, mvhdVersion)
    if (mvhdVersion === 0) {
      v.setUint32(12, timescale)
      v.setUint32(16, duration)
    } else {
      v.setUint32(20, timescale)
      v.setUint32(28, duration)
    }
    return mvhd
  }
  const trakBox = (): Uint8Array => {
    const tkhdLen = tkhdVersion === 0 ? 84 : 96
    const tkhd = new Uint8Array(tkhdLen)
    const v = new DataView(tkhd.buffer)
    v.setUint8(0, tkhdVersion)
    const wOff = tkhdVersion === 0 ? 76 : 88
    v.setUint32(wOff, Math.round(width * 65536))
    v.setUint32(wOff + 4, Math.round(height * 65536))
    const children = [box('tkhd', tkhd)]
    if (trakLead) children.unshift(trakLead)
    if (trakTrailer) children.push(trakTrailer)
    const body = new Uint8Array(children.reduce((n, c) => n + c.length, 0))
    let p = 0
    for (const c of children) {
      body.set(c, p)
      p += c.length
    }
    return box('trak', body)
  }
  const moovChildren: Uint8Array[] = []
  if (withMvhd) moovChildren.push(box('mvhd', mvhdBody()))
  if (extraMvhd) moovChildren.push(box('mvhd', mvhdBody()))
  if (withTkhd) moovChildren.push(trakBox())
  if (extraTrak) moovChildren.push(trakBox())
  if (moovTrailer) moovChildren.push(moovTrailer)
  const moovBody = new Uint8Array(moovChildren.reduce((n, c) => n + c.length, 0))
  let off = 0
  for (const c of moovChildren) {
    moovBody.set(c, off)
    off += c.length
  }
  chunks.push(box('moov', moovBody))
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

/** 64 位 largesize 的 free 盒子（size=1, high=0, low=24） */
function craftLargeFree(): Uint8Array {
  const out = new Uint8Array(24)
  const v = new DataView(out.buffer)
  v.setUint32(0, 1)
  tag(out, 4, 'free')
  v.setUint32(8, 0)
  v.setUint32(12, 24)
  return out
}

/** 非法盒头：声明 size=4（< 8） */
function craftBadSizeBox(): Uint8Array {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setUint32(0, 4)
  tag(out, 4, 'free')
  return out
}

/** high != 0 的 largesize 盒子 → 解析器拒绝 */
function craftHugeHighBox(): Uint8Array {
  const out = new Uint8Array(16)
  const v = new DataView(out.buffer)
  v.setUint32(0, 1)
  tag(out, 4, 'free')
  v.setUint32(8, 1)
  v.setUint32(12, 24)
  return out
}

describe('media-metadata / 容器识别', () => {
  it('各类魔数识别正确', () => {
    expect(detectMediaKind(craftWav())).toBe('wav')
    expect(detectMediaKind(craftMp3Frame(false))).toBe('mp3')
    expect(detectMediaKind(craftMp3Frame(true))).toBe('mp3')
    expect(detectMediaKind(craftMp4())).toBe('mp4')
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01])
    expect(detectMediaKind(webm)).toBe('webm')
    const flac = new Uint8Array(4)
    tag(flac, 0, 'fLaC')
    expect(detectMediaKind(flac)).toBe('flac')
    const ogg = new Uint8Array(4)
    tag(ogg, 0, 'OggS')
    expect(detectMediaKind(ogg)).toBe('ogg')
  })

  it('未知 / 过短 → unknown', () => {
    expect(detectMediaKind(new Uint8Array([1, 2, 3, 4, 5]))).toBe('unknown')
    expect(detectMediaKind(new Uint8Array(0))).toBe('unknown')
    expect(detectMediaKind(new Uint8Array(2))).toBe('unknown')
    expect(detectMediaKind(new Uint8Array(12))).toBe('unknown')
    const badRiff = craftWav()
    badRiff[8] = 'X'.charCodeAt(0)
    expect(detectMediaKind(badRiff)).toBe('unknown')
  })

  it('容器中文名', () => {
    expect(mediaKindLabel('wav')).toContain('WAV')
    expect(mediaKindLabel('mp4')).toContain('MP4')
    expect(mediaKindLabel('unknown')).toBe('未知格式')
  })
})

describe('media-metadata / WAV 解析', () => {
  it('解析采样率 / 声道 / 位深 / 时长', () => {
    const info = parseWavInfo(craftWav(44100, 2, 16, 44100 * 2 * 2))
    expect(info.sampleRate).toBe(44100)
    expect(info.channels).toBe(2)
    expect(info.bitsPerSample).toBe(16)
    expect(info.durationSec).toBeCloseTo(1, 9)
    expect(info.dataBytes).toBe(44100 * 2 * 2)
  })

  it('非法 WAV 抛中文错', () => {
    expect(() => parseWavInfo(craftMp3Frame(false))).toThrow(/不是合法的 WAV/)
    const noFmt = craftWav()
    tag(noFmt, 12, 'XXXX')
    expect(() => parseWavInfo(noFmt)).toThrow(/缺少 fmt chunk/)
    const noData = craftWav()
    tag(noData, 36, 'XXXX')
    expect(() => parseWavInfo(noData)).toThrow(/缺少 data chunk/)
    const badParam = craftWav()
    new DataView(badParam.buffer).setUint16(22, 0, true)
    expect(() => parseWavInfo(badParam)).toThrow(/音频参数非法/)
    const badRate = craftWav()
    new DataView(badRate.buffer).setUint32(24, 0, true)
    expect(() => parseWavInfo(badRate)).toThrow(/音频参数非法/)
    const badBits = craftWav()
    new DataView(badBits.buffer).setUint16(34, 0, true)
    expect(() => parseWavInfo(badBits)).toThrow(/音频参数非法/)
  })
})

describe('media-metadata / MP3 解析', () => {
  it('解析 MPEG1 Layer III 帧头', () => {
    const info = parseMp3Info(craftMp3Frame(false))
    expect(info.mpegVersion).toBe('1')
    expect(info.bitrateKbps).toBe(128)
    expect(info.sampleRateHz).toBe(44100)
    expect(info.channels).toBe(2)
  })

  it('跳过 ID3v2 标签后解析', () => {
    const info = parseMp3Info(craftMp3Frame(true))
    expect(info.bitrateKbps).toBe(128)
  })

  it('MPEG 2.5 帧头', () => {
    // 0xe3: version bits=00 → MPEG 2.5, layer bits=01 → Layer III
    const info = parseMp3Info(new Uint8Array([0xff, 0xe3, 0x90, 0x00]))
    expect(info.mpegVersion).toBe('2.5')
    expect(info.bitrateKbps).toBe(80)
    expect(info.sampleRateHz).toBe(11025)
  })

  it('单声道帧', () => {
    const frame = craftMp3Frame(false)
    frame[3] = 0xc0 // channel mode = 单声道
    const info = parseMp3Info(frame)
    expect(info.channels).toBe(1)
  })

  it('MPEG2 帧头', () => {
    const frame = new Uint8Array([0xff, 0xf3, 0x90, 0x00])
    const info = parseMp3Info(frame)
    expect(info.mpegVersion).toBe('2')
    expect(info.sampleRateHz).toBe(22050)
  })

  it('找不到帧头 / 非法参数抛中文错', () => {
    expect(() => parseMp3Info(new Uint8Array(100))).toThrow(/未找到 MP3 音频帧/)
    // 帧头超出 64KB 搜索窗口 → 同样视为找不到
    const far = new Uint8Array(70000)
    far.set([0xff, 0xfb, 0x90, 0x00], 66000)
    expect(() => parseMp3Info(far)).toThrow(/未找到 MP3 音频帧/)
    const badVersion = new Uint8Array([0xff, 0xeb, 0x90, 0x00])
    expect(() => parseMp3Info(badVersion)).toThrow(/MPEG 版本/)
    const badLayer = new Uint8Array([0xff, 0xf9, 0x90, 0x00])
    expect(() => parseMp3Info(badLayer)).toThrow(/Layer III/)
    const badBitrate = new Uint8Array([0xff, 0xfb, 0x00, 0x00])
    expect(() => parseMp3Info(badBitrate)).toThrow(/帧头参数非法/)
    const badSampleRate = new Uint8Array([0xff, 0xfb, 0x9c, 0x00])
    expect(() => parseMp3Info(badSampleRate)).toThrow(/帧头参数非法/)
  })
})

describe('media-metadata / MP4 解析', () => {
  it('解析主品牌 / 时长 / 分辨率', () => {
    const info = parseMp4Info(craftMp4())
    expect(info.majorBrand).toBe('isom')
    expect(info.durationSec).toBeCloseTo(5, 9)
    expect(info.width).toBe(1280)
    expect(info.height).toBe(720)
  })

  it('mvhd v1 版本', () => {
    const info = parseMp4Info(craftMp4({ mvhdVersion: 1, timescale: 90000, duration: 180000 }))
    expect(info.durationSec).toBeCloseTo(2, 9)
  })

  it('mvhd 未知版本 → 时长 null', () => {
    const info = parseMp4Info(craftMp4({ mvhdVersion: 2 }))
    expect(info.durationSec).toBeNull()
  })

  it('tkhd v1 版本（宽高偏移不同）', () => {
    const info = parseMp4Info(craftMp4({ tkhdVersion: 1, width: 1920, height: 1080 }))
    expect(info.width).toBe(1920)
    expect(info.height).toBe(1080)
  })

  it('缺 mvhd / tkhd 时字段为 null，不抛错', () => {
    const noMvhd = parseMp4Info(craftMp4({ withMvhd: false }))
    expect(noMvhd.durationSec).toBeNull()
    expect(noMvhd.width).toBe(1280)
    const noTkhd = parseMp4Info(craftMp4({ withTkhd: false }))
    expect(noTkhd.width).toBeNull()
    expect(noTkhd.height).toBeNull()
    expect(noTkhd.durationSec).toBeCloseTo(5, 9)
  })

  it('timescale 为 0 → 时长 null', () => {
    const info = parseMp4Info(craftMp4({ timescale: 0 }))
    expect(info.durationSec).toBeNull()
  })

  it('v1 mvhd 的 64 位时长高 32 位非零 → 拒绝', () => {
    const bytes = craftMp4({ mvhdVersion: 1 })
    new DataView(bytes.buffer).setUint32(32 + 24, 1) // mvhd 内容偏移 32，高 32 位
    expect(parseMp4Info(bytes).durationSec).toBeNull()
  })

  it('v1 mvhd 声明 size 超出文件 → 时长 null', () => {
    const bytes = craftMp4({ mvhdVersion: 1 })
    new DataView(bytes.buffer).setUint32(24, 5000) // mvhd 盒头在 24，改大 size
    expect(parseMp4Info(bytes).durationSec).toBeNull()
  })

  it('截断的 mvhd（v0 / v1）→ 时长 null，不抛错', () => {
    expect(parseMp4Info(craftMp4().slice(0, 50)).durationSec).toBeNull()
    expect(parseMp4Info(craftMp4({ mvhdVersion: 1 }).slice(0, 60)).durationSec).toBeNull()
  })

  it('宽高非法（0）→ 分辨率 null', () => {
    const zeroW = parseMp4Info(craftMp4({ width: 0 }))
    expect(zeroW.width).toBeNull()
    const zeroH = parseMp4Info(craftMp4({ height: 0 }))
    expect(zeroH.width).toBeNull()
    expect(zeroH.height).toBeNull()
  })

  it('tkhd 声明 size 超出文件 → 分辨率 null', () => {
    const bytes = craftMp4()
    new DataView(bytes.buffer).setUint32(60, 5000) // tkhd 盒头在 60
    const info = parseMp4Info(bytes)
    expect(info.width).toBeNull()
    expect(info.durationSec).toBeCloseTo(5, 9)
  })

  it('截断的 tkhd → 分辨率 null', () => {
    const info = parseMp4Info(craftMp4().slice(0, 150))
    expect(info.width).toBeNull()
    expect(info.durationSec).toBeCloseTo(5, 9)
  })

  it('重复的 mvhd / trak 只取第一个', () => {
    const info = parseMp4Info(craftMp4({ extraMvhd: true, extraTrak: true }))
    expect(info.durationSec).toBeCloseTo(5, 9)
    expect(info.width).toBe(1280)
  })

  it('largesize（64 位）盒子被正确跳过', () => {
    const rest = craftMp4()
    const bytes = new Uint8Array(24 + rest.length)
    bytes.set(craftLargeFree(), 0)
    bytes.set(rest, 24)
    const info = parseMp4Info(bytes)
    expect(info.majorBrand).toBe('isom')
    expect(info.durationSec).toBeCloseTo(5, 9)
  })

  it('moov 内未知盒子被跳过，非法盒头终止内层循环', () => {
    const trailer = new Uint8Array(16)
    const freeBox = new Uint8Array(8)
    new DataView(freeBox.buffer).setUint32(0, 8)
    tag(freeBox, 4, 'free')
    trailer.set(freeBox, 0)
    trailer.set(craftBadSizeBox(), 8)
    const info = parseMp4Info(craftMp4({ moovTrailer: trailer }))
    expect(info.durationSec).toBeCloseTo(5, 9)
  })

  it('trak 内未知盒子被跳过，非法盒头终止内层循环', () => {
    const trailer = new Uint8Array(16)
    const freeBox = new Uint8Array(8)
    new DataView(freeBox.buffer).setUint32(0, 8)
    tag(freeBox, 4, 'free')
    trailer.set(freeBox, 0)
    trailer.set(craftBadSizeBox(), 8)
    const info = parseMp4Info(craftMp4({ trakTrailer: trailer }))
    expect(info.width).toBe(1280)
  })

  it('trak 开头就是非法盒头 → 停止该 trak 解析，分辨率 null', () => {
    const info = parseMp4Info(craftMp4({ trakLead: craftBadSizeBox() }))
    expect(info.width).toBeNull()
    expect(info.durationSec).toBeCloseTo(5, 9)
  })

  it('trak 内非 tkhd 的合法盒子被跳过，继续解析后面的 tkhd', () => {
    const freeBox = new Uint8Array(8)
    new DataView(freeBox.buffer).setUint32(0, 8)
    tag(freeBox, 4, 'free')
    const info = parseMp4Info(craftMp4({ trakLead: freeBox }))
    expect(info.width).toBe(1280)
    expect(info.height).toBe(720)
  })

  it('moov 声明 size 超出文件 → 内层读到文件尾安全停止', () => {
    const bytes = craftMp4().slice(0, 58)
    new DataView(bytes.buffer).setUint32(16, 5000) // moov size 改大
    const info = parseMp4Info(bytes)
    expect(info.durationSec).toBeCloseTo(5, 9)
    expect(info.majorBrand).toBe('isom')
  })

  it('size=0 的盒子表示延续到文件尾并终止顶层循环', () => {
    const rest = craftMp4()
    const tail = new Uint8Array(8)
    tag(tail, 4, 'free') // size 字段为 0
    const bytes = new Uint8Array(rest.length + 8)
    bytes.set(rest, 0)
    bytes.set(tail, rest.length)
    const info = parseMp4Info(bytes)
    expect(info.majorBrand).toBe('isom')
  })

  it('ftyp 盒体截断 → 主品牌为空', () => {
    const bytes = craftMp4()
    new DataView(bytes.buffer).setUint32(0, 8) // ftyp size 改为 8（无盒体）
    expect(parseMp4Info(bytes).majorBrand).toBe('')
  })

  it('high != 0 的 largesize 盒子 → 停止解析', () => {
    expect(parseMp4Info(craftHugeHighBox()).majorBrand).toBe('')
  })

  it('声明 size < 8 的非法盒头 → 停止解析', () => {
    expect(parseMp4Info(craftBadSizeBox()).majorBrand).toBe('')
  })

  it('截断的 largesize 盒头（不足 16 字节）→ 停止解析', () => {
    expect(parseMp4Info(craftLargeFree().slice(0, 10)).majorBrand).toBe('')
  })

  it('空输入不抛错，全字段空', () => {
    const info = parseMp4Info(new Uint8Array(0))
    expect(info.majorBrand).toBe('')
    expect(info.durationSec).toBeNull()
    expect(info.width).toBeNull()
  })
})

describe('media-metadata / 格式化与报告', () => {
  it('formatBytes / formatDuration / formatBitrate', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MiB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
    expect(formatDuration(83.456)).toBe('83.46 秒')
    expect(formatDuration(null)).toBe('未知')
    expect(() => formatDuration(-1)).toThrow(/时长非法/)
    expect(formatBitrate(128)).toBe('128 kbps')
    expect(() => formatBitrate(-1)).toThrow(/码率非法/)
  })

  it('buildMetadataReport 拼多行报告', () => {
    const report = buildMetadataReport([
      ['文件名', 'a.mp3'],
      ['码率', '128 kbps'],
    ])
    expect(report).toBe('文件名：a.mp3\n码率：128 kbps')
    expect(() => buildMetadataReport([])).toThrow(/没有可展示的元信息/)
  })
})
