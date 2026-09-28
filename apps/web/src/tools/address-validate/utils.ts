/**
 * address-validate（#691）工具函数：
 * 纯 JS 的 Keccak-256（FIPS 202 海绵结构，Keccak padding 0x01…0x80，
 * 区别于 SHA3-256 的域分隔 0x06）+ EIP-55 checksum 地址校验。
 * 全部纯函数，便于单测。
 */

const MASK64 = (1n << 64n) - 1n

/** Keccak-f[1600] 的 24 轮轮常数（与 sha3-hash 工具一致） */
const RC: readonly bigint[] = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
]

/** rho 旋转偏移，扁平下标 i = x + 5y（FIPS 202 表 2） */
const ROT: readonly number[] = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
]

/** 64 位循环左移 */
function rotl64(value: bigint, shift: number): bigint {
  const s = BigInt(shift)
  return ((value << s) | (value >> (64n - s))) & MASK64
}

/** Keccak-f[1600] 置换：theta → rho → pi → chi → iota */
function keccakF(a: bigint[]): void {
  const c = new Array<bigint>(5)
  const b = new Array<bigint>(25)
  for (let round = 0; round < 24; round += 1) {
    for (let x = 0; x < 5; x += 1) {
      c[x] = a[x] ^ a[x + 5] ^ a[x + 10] ^ a[x + 15] ^ a[x + 20]
    }
    for (let x = 0; x < 5; x += 1) {
      const d = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1)
      for (let y = 0; y < 5; y += 1) a[x + 5 * y] ^= d
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(a[x + 5 * y], ROT[x + 5 * y])
      }
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        const i = x + 5 * y
        a[i] = (b[i] ^ (~b[((x + 1) % 5) + 5 * y] & b[((x + 2) % 5) + 5 * y])) & MASK64
      }
    }
    a[0] ^= RC[round]
  }
}

/**
 * Keccak-256 摘要：速率 136 字节（200 − 2×32）；
 * Keccak padding：首填充字节 0x01（非 SHA3 的 0x06），末字节按位或 0x80。
 */
export function keccak256(bytes: Uint8Array): Uint8Array {
  const rate = 136
  const state = new Array<bigint>(25).fill(0n)

  const padLength = rate - (bytes.length % rate)
  const padded = new Uint8Array(bytes.length + padLength)
  padded.set(bytes)
  padded[bytes.length] = 0x01
  padded[bytes.length + padLength - 1] |= 0x80

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate; i += 1) {
      const lane = i >> 3
      state[lane] ^= BigInt(padded[offset + i]) << BigInt((i & 7) * 8)
    }
    keccakF(state)
  }

  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i += 1) {
    out[i] = Number((state[i >> 3] >> BigInt((i & 7) * 8)) & 0xffn)
  }
  return out
}

/** 字节数组转小写 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** UTF-8 编码 */
function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/**
 * EIP-55 checksum 编码：输入 40 位 hex（可带 0x），返回带 0x 的 checksum 地址。
 * 输入须已通过格式校验。
 */
export function toChecksumAddress(address: string): string {
  const hex = address.startsWith('0x') || address.startsWith('0X') ? address.slice(2) : address
  const lower = hex.toLowerCase()
  const hash = bytesToHex(keccak256(utf8Bytes(lower)))
  let out = '0x'
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i]
    out += /[a-f]/.test(ch) && parseInt(hash[i], 16) >= 8 ? ch.toUpperCase() : ch
  }
  return out
}

export interface AddressResult {
  /** 输入是否可识别为有效地址 */
  valid: boolean
  /** 规范形式（带 0x 的小写地址），无效时为 '' */
  normalized: string
  /** EIP-55 checksum 地址，无效时为 '' */
  checksummed: string
  /** 问题描述列表（空表示完全合规） */
  issues: string[]
}

/**
 * 校验以太坊地址：
 * - 格式：可选 0x 前缀 + 40 位 hex
 * - 全小写 / 全大写：有效但提示未使用 checksum 编码
 * - 混合大小写：必须与 EIP-55 checksum 一致
 */
export function validateAddress(input: string): AddressResult {
  const trimmed = input.trim()
  if (trimmed === '') throw new Error('地址不能为空')

  const m = /^(0[xX])?([0-9a-fA-F]{40})$/.exec(trimmed)
  if (!m) {
    if (/^(0[xX])?[0-9a-fA-F]*$/.test(trimmed)) {
      const hexLen = trimmed.replace(/^0[xX]/, '').length
      throw new Error(`地址长度错误：应为 40 位 hex，当前 ${hexLen} 位`)
    }
    throw new Error('地址格式错误：应为 0x 开头的 40 位十六进制字符')
  }

  const body = m[2]
  const normalized = `0x${body.toLowerCase()}`
  const checksummed = toChecksumAddress(normalized)
  const issues: string[] = []

  const isAllLower = body === body.toLowerCase()
  const isAllUpper = body === body.toUpperCase()
  if (isAllLower || isAllUpper) {
    issues.push('未使用 EIP-55 checksum 编码（全小写 / 全大写地址有效但不推荐）')
    return { valid: true, normalized, checksummed, issues }
  }

  if (`0x${body}` !== checksummed) {
    return {
      valid: false,
      normalized: '',
      checksummed: '',
      issues: ['EIP-55 checksum 校验失败：大小写与校验和不符，可能输错地址'],
    }
  }
  return { valid: true, normalized, checksummed, issues }
}

/** 批量校验（每行一个地址），返回每行结果 */
export function validateBatch(text: string): { input: string; result: AddressResult }[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l !== '')
  if (lines.length === 0) throw new Error('至少输入 1 个地址')
  if (lines.length > 500) throw new Error('单次最多校验 500 个地址')
  return lines.map((line) => {
    try {
      return { input: line, result: validateAddress(line) }
    } catch (e) {
      // validateAddress 只抛 Error（见上），此处直接取 message，无分支
      const message = (e as Error).message
      return {
        input: line,
        result: {
          valid: false,
          normalized: '',
          checksummed: '',
          issues: [message],
        },
      }
    }
  })
}

/** 渲染单行校验报告 */
export function renderReport(input: string, result: AddressResult): string {
  const lines = [`地址：${input}`, `有效：${result.valid ? '是' : '否'}`]
  if (result.valid) {
    lines.push(`规范形式：${result.normalized}`)
    lines.push(`Checksum：${result.checksummed}`)
  }
  for (const issue of result.issues) lines.push(`提示：${issue}`)
  return lines.join('\n')
}
