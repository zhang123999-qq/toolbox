import type { PgpToolInput, PgpToolOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class PgpToolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PgpToolError'
  }
}

const MAX_INPUT = 200_000

// ————————————————————————————————————————————————————————————
// Radix64（OpenPGP ASCII Armor）：base64 + 24 位 CRC
// ————————————————————————————————————————————————————————————

const CRC24_INIT = 0x00b704ce
const CRC24_POLY = 0x01864cfb

/** RFC 4880 §6.1 的 24 位 CRC（与 ASCII Armor 末尾校验行配套） */
export function crc24(data: Uint8Array): number {
  let crc = CRC24_INIT
  for (const byte of data) {
    crc ^= byte << 16
    for (let i = 0; i < 8; i += 1) {
      crc <<= 1
      if (crc & 0x01000000) crc ^= CRC24_POLY
    }
  }
  return crc & 0x00ffffff
}

function bytesToBinary(data: Uint8Array): string {
  let out = ''
  const chunk = 0x8000
  for (let i = 0; i < data.length; i += chunk) {
    out += String.fromCharCode(...data.subarray(i, i + chunk))
  }
  return out
}

function binaryToBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff
  return bytes
}

/** 二进制 → Radix64（标准 base64） */
export function radix64Encode(data: Uint8Array): string {
  return btoa(bytesToBinary(data))
}

/** Radix64 → 二进制（容忍换行 / 空白） */
export function radix64Decode(text: string): Uint8Array {
  const compact = text.replace(/\s+/g, '')
  try {
    return binaryToBytes(atob(compact))
  } catch {
    throw new PgpToolError('Radix64（base64）内容损坏，无法解码')
  }
}

// ————————————————————————————————————————————————————————————
// Armor 块
// ————————————————————————————————————————————————————————————

export interface ArmorBlock {
  /** BEGIN/END 行里的类型名，如 PUBLIC KEY BLOCK / SIGNATURE / MESSAGE */
  readonly label: string
  /** Armor 头（Version / Comment / Hash …） */
  readonly headers: Readonly<Record<string, string>>
  /** 解码后的二进制 */
  readonly body: Uint8Array
  /** 末尾 `=xxxx` 解出的 CRC24；无校验行时为 null */
  readonly declaredCrc: number | null
  /** 按体内容实算的 CRC24 */
  readonly actualCrc: number
  /** 校验行是否存在且匹配 */
  readonly crcValid: boolean
}

/** 提取全部 PGP armor 块 */
export function parseArmor(text: string): ArmorBlock[] {
  const blocks: ArmorBlock[] = []
  const begin = /-----BEGIN PGP ([A-Za-z ]+)-----/g
  let m: RegExpExecArray | null
  while ((m = begin.exec(text)) !== null) {
    const label = (m[1] ?? '').trim()
    const endTag = `-----END PGP ${label}-----`
    const start = m.index + m[0].length
    const end = text.indexOf(endTag, start)
    if (end < 0) throw new PgpToolError(`「${label}」缺少结束行 ${endTag}`)

    const section = text.slice(start, end)
    const split = section.split(/\r?\n\r?\n/)
    // 可能没有头字段：此时首段就是 base64
    const hasHeaders =
      /^[^\n]*:\s*.+/.test((split[0] ?? '').trim()) && !/^[A-Za-z0-9+/=\s]+$/.test(split[0] ?? '')
    const headerPart = hasHeaders ? (split[0] ?? '') : ''
    const payloadPart = hasHeaders ? split.slice(1).join('\n') : section

    const headers: Record<string, string> = {}
    for (const line of headerPart.split(/\r?\n/)) {
      const hm = /^([A-Za-z-]+):\s*(.*)$/.exec(line.trim())
      if (hm) headers[hm[1]] = hm[2]
    }

    // 最后一行可能是 CRC：=xxxx
    const lines = payloadPart
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '')
    let declaredCrc: number | null = null
    if (lines.length > 0 && lines[lines.length - 1].startsWith('=')) {
      const crcLine = lines.pop() as string
      const crcBytes = radix64Decode(crcLine.slice(1))
      declaredCrc = (crcBytes[0] << 16) | (crcBytes[1] << 8) | crcBytes[2]
    }

    const body = radix64Decode(lines.join('\n'))
    const actualCrc = crc24(body)
    blocks.push({
      label,
      headers,
      body,
      declaredCrc,
      actualCrc,
      crcValid: declaredCrc === null ? false : declaredCrc === actualCrc,
    })
  }
  return blocks
}

// ————————————————————————————————————————————————————————————
// OpenPGP packet（RFC 4880 §4）
// ————————————————————————————————————————————————————————————

const PACKET_TAG_NAMES: Record<number, string> = {
  0: '保留',
  1: '公钥加密会话密钥（PKESK）',
  2: '签名包',
  3: '对称密钥加密会话密钥（SKESK）',
  4: '一键签名（OPS）',
  5: '私钥',
  6: '公钥',
  7: '子私钥',
  8: '压缩数据',
  9: '对称加密数据',
  10: '标记包',
  11: '字面数据',
  12: '信任包',
  13: '用户 ID',
  14: '公钥子钥',
  17: '用户属性',
  18: 'MDC 完整性保护',
  19: 'AEAD 加密数据',
}

/** 公钥 / 私钥算法 OID → 名称（仅列常见项） */
const KEY_ALGORITHMS: Record<number, string> = {
  1: 'RSA（加密或签名）',
  2: 'RSA（仅加密）',
  3: 'RSA（仅签名）',
  16: 'ElGamal',
  17: 'DSA',
  18: 'ECDH（椭圆曲线）',
  19: 'ECDSA',
  21: 'Diffie-Hellman',
  22: 'EdDSA（Ed25519）',
}

export interface PacketInfo {
  readonly tag: number
  readonly name: string
  readonly length: number
  readonly newFormat: boolean
  /** 密钥包才有的补充信息 */
  readonly key?: {
    readonly version: number
    readonly createdAt: string
    readonly algorithm: string
  }
  /** 用户 ID 内容 */
  readonly userId?: string
}

/** 读 new-format 长度（RFC 4880 §4.2.2），返回 [长度, 长度字段占的字节数] */
function readNewLength(data: Uint8Array, offset: number): [number, number] {
  const first = data[offset]
  if (first < 192) return [first, 1]
  if (first < 224) {
    const second = data[offset + 1]
    return [((first - 192) << 8) + second + 192, 2]
  }
  if (first === 255) {
    const len =
      (data[offset + 1] << 24) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 8) |
      data[offset + 4]
    return [len, 5]
  }
  // 192..223 部分长度（不确定长），这里不展开
  return [-(first - 224), 1]
}

function readUint32(data: Uint8Array, offset: number): number {
  return (
    (((data[offset] ?? 0) << 24) |
      ((data[offset + 1] ?? 0) << 16) |
      ((data[offset + 2] ?? 0) << 8) |
      (data[offset + 3] ?? 0)) >>>
    0
  )
}

/** 解析全部 packet 的头部信息（不深入密钥材料 / 加密体） */
export function parsePackets(body: Uint8Array): PacketInfo[] {
  const packets: PacketInfo[] = []
  let offset = 0
  while (offset < body.length) {
    const first = body[offset]
    if ((first & 0x80) === 0) {
      throw new PgpToolError(`第 ${offset} 字节不是合法 packet 起始位（最高位应为 1）`)
    }
    const newFormat = (first & 0x40) !== 0
    let tag: number
    let contentOffset: number
    let length: number

    if (newFormat) {
      tag = first & 0x3f
      const [len, lenBytes] = readNewLength(body, offset + 1)
      length = len
      contentOffset = offset + 1 + lenBytes
    } else {
      tag = (first >> 2) & 0x0f
      const lengthType = first & 0x03
      if (lengthType === 3) {
        // 长度不确定（主要用于老格式数据块），无法安全切片，结束头部解析
        packets.push({
          tag,
          name: PACKET_TAG_NAMES[tag] ?? `未知包(${tag})`,
          length: body.length - offset - 1,
          newFormat,
        })
        break
      }
      const numBytes = [2, 3, 5][lengthType] ?? 0
      if (numBytes === 0) throw new PgpToolError('不支持的老格式 packet 长度类型')
      let len = 0
      for (let i = 0; i < numBytes; i += 1) len = (len << 8) | body[offset + 1 + i]
      length = len
      contentOffset = offset + 1 + numBytes
    }

    const content = body.subarray(contentOffset, contentOffset + Math.max(0, length))
    const info: PacketInfo = {
      tag,
      name: PACKET_TAG_NAMES[tag] ?? `未知包(${tag})`,
      length: Math.max(0, length),
      newFormat,
    }

    if ((tag === 5 || tag === 6 || tag === 7 || tag === 14) && content.length >= 6) {
      const version = content[0]
      const createdSeconds = readUint32(content, 1)
      const algoByte = content[5]
      packets.push({
        ...info,
        key: {
          version,
          createdAt: new Date(createdSeconds * 1000).toISOString(),
          algorithm: KEY_ALGORITHMS[algoByte] ?? `算法 ${algoByte}`,
        },
      })
    } else if (tag === 13) {
      try {
        packets.push({ ...info, userId: new TextDecoder('utf-8').decode(content) })
      } catch {
        packets.push(info)
      }
    } else {
      packets.push(info)
    }

    if (length < 0) break
    offset = contentOffset + Math.max(0, length)
  }
  return packets
}

// ————————————————————————————————————————————————————————————
// 报告与演示
// ————————————————————————————————————————————————————————————

const toHex = (n: number): string => n.toString(16).padStart(6, '0').toUpperCase()

/** 生成一段合成的演示 armor（new-format 公钥包 + 用户 ID 包），仅用于展示解析，不是真实密钥 */
export function buildDemoArmor(): string {
  const now = Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000)
  // 公钥包体：version=4 + 4 字节时间 + 1 字节算法(1=RSA)，材料留空（演示用）
  const keyContent = new Uint8Array(6)
  keyContent[0] = 4
  keyContent[1] = (now >>> 24) & 0xff
  keyContent[2] = (now >>> 16) & 0xff
  keyContent[3] = (now >>> 8) & 0xff
  keyContent[4] = now & 0xff
  keyContent[5] = 1
  const idContent = new TextEncoder().encode('Demo User (synthetic) <demo@example.com>')

  const enc = (tag: number, content: Uint8Array): Uint8Array => {
    const header = newLength(content.length)
    const out = new Uint8Array(1 + header.length + content.length)
    out[0] = 0xc0 | tag
    out.set(header, 1)
    out.set(content, 1 + header.length)
    return out
  }
  const keyPacket = enc(6, keyContent)
  const idPacket = enc(13, idContent)
  const body = new Uint8Array(keyPacket.length + idPacket.length)
  body.set(keyPacket, 0)
  body.set(idPacket, keyPacket.length)

  const b64 =
    radix64Encode(body)
      .match(/.{1,64}/g)
      ?.join('\n') ?? ''
  const crc = crc24(body)
  const crcBytes = new Uint8Array([(crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff])
  const crcB64 = radix64Encode(crcBytes)
  return [
    '-----BEGIN PGP PUBLIC KEY BLOCK-----',
    'Version: pgp-tool demo (synthetic, not a real key)',
    '',
    b64,
    `=${crcB64}`,
    '-----END PGP PUBLIC KEY BLOCK-----',
    '',
  ].join('\n')
}

/** new-format packet 长度字段编码（<8384 用 1~2 字节，演示数据足够） */
function newLength(length: number): Uint8Array {
  if (length < 192) return new Uint8Array([length])
  if (length < 8384) {
    const value = length - 192
    return new Uint8Array([(value >> 8) + 192, value & 0xff])
  }
  const out = new Uint8Array(5)
  out[0] = 255
  out[1] = (length >>> 24) & 0xff
  out[2] = (length >>> 16) & 0xff
  out[3] = (length >>> 8) & 0xff
  out[4] = length & 0xff
  return out
}

/** 单块 → 中文文本报告 */
export function renderBlock(block: ArmorBlock, index: number): string {
  const lines: string[] = []
  lines.push(`—— 块 ${index + 1}：PGP ${block.label} ——`)
  for (const [key, value] of Object.entries(block.headers)) {
    lines.push(`头字段 ${key}: ${value}`)
  }
  lines.push(`体大小：${block.body.length} 字节`)
  if (block.declaredCrc === null) {
    lines.push('CRC24：未提供校验行（部分实现会省略）')
  } else {
    lines.push(
      `CRC24：${block.crcValid ? '匹配' : '不匹配（内容可能被改动或损坏）'}（声明 ${toHex(
        block.declaredCrc,
      )} / 实算 ${toHex(block.actualCrc)}）`,
    )
  }

  let packets: PacketInfo[]
  try {
    packets = parsePackets(block.body)
  } catch (error) {
    lines.push(`Packet 解析：${error instanceof Error ? error.message : '失败'}`)
    return lines.join('\n')
  }

  lines.push(`Packet：${packets.length} 个`)
  packets.forEach((p, i) => {
    const fmt = p.newFormat ? '新格式' : '老格式'
    let detail = `  ${i + 1}. [tag ${p.tag}] ${p.name}（${fmt}，${p.length} 字节）`
    if (p.key) {
      detail += `\n       v${p.key.version} · ${p.key.algorithm} · 创建于 ${p.key.createdAt}`
    }
    if (p.userId) detail += `\n       UID：${p.userId}`
    lines.push(detail)
  })
  return lines.join('\n')
}

export function transform(input: PgpToolInput, _options: PgpToolOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new PgpToolError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  const blocks = parseArmor(input.text)
  if (blocks.length === 0) {
    throw new PgpToolError('没有找到 -----BEGIN PGP ...----- Armor 块')
  }
  const reports = blocks.map((block, i) => renderBlock(block, i))
  reports.unshift(
    `共解析 ${blocks.length} 段 PGP Armor（本工具只做结构检查，不做加解密 / 签名验证）`,
  )
  return reports.join('\n\n')
}
