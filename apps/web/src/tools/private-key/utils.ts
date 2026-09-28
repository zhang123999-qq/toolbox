/**
 * private-key（#692）工具函数：
 * 以太坊 secp256k1 私钥生成 —— crypto.getRandomValues 产生 32 字节随机数，
 * 校验 1 ≤ k < n（n 为 secp256k1 阶）后输出 hex。
 * 随机源可注入，便于单测确定性；默认走浏览器 / Node 的 crypto.getRandomValues。
 */

/** secp256k1 曲线的阶 n */
export const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

/** 默认随机源：crypto.getRandomValues */
function defaultRandomSource(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/** 字节数组转小写 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** hex 转字节数组（不含 0x 前缀，需偶数位 hex） */
export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** 字节数组是否为有效私钥：长度 32 且 1 ≤ k < n */
export function isValidPrivateKeyBytes(bytes: Uint8Array): boolean {
  if (bytes.length !== 32) return false
  let k = 0n
  for (const b of bytes) k = (k << 8n) | BigInt(b)
  return k >= 1n && k < SECP256K1_N
}

/**
 * 生成一个私钥（32 字节）。随机源持续产出无效值（概率可忽略）时重试，
 * 100 次仍无效则抛错。
 */
export function generatePrivateKey(
  randomSource: (length: number) => Uint8Array = defaultRandomSource,
): Uint8Array {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = randomSource(32)
    if (isValidPrivateKeyBytes(bytes)) return bytes
  }
  throw new Error('生成私钥失败：随机源持续产出无效值')
}

/** 格式化私钥为 hex，可选 0x 前缀 */
export function formatPrivateKey(bytes: Uint8Array, prefix: boolean): string {
  const hex = bytesToHex(bytes)
  return prefix ? `0x${hex}` : hex
}

/** 生成 count 个私钥并格式化 */
export function generatePrivateKeys(
  count: number,
  prefix: boolean,
  randomSource?: (length: number) => Uint8Array,
): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('生成数量须为 1–100 的整数')
  }
  const keys: string[] = []
  for (let i = 0; i < count; i += 1) {
    keys.push(formatPrivateKey(generatePrivateKey(randomSource), prefix))
  }
  return keys
}

/** 解析用户粘贴的私钥文本：可选 0x 前缀 + 64 位 hex，且须在有效范围内 */
export function parsePrivateKey(text: string): Uint8Array {
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('私钥不能为空')
  const m = /^(0[xX])?([0-9a-fA-F]{64})$/.exec(trimmed)
  if (!m) throw new Error('私钥格式错误：应为 64 位十六进制字符（可带 0x 前缀）')
  const bytes = hexToBytes(m[2].toLowerCase())
  if (!isValidPrivateKeyBytes(bytes)) {
    throw new Error('私钥数值无效：须满足 1 ≤ k < secp256k1 阶')
  }
  return bytes
}
