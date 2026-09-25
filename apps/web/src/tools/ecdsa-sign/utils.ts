import type { EcdsaInput, EcdsaOptions } from './schema'

/** 字节类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/** 分块大小：避免 String.fromCharCode(...) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 可选曲线与摘要 */
export const CURVES = ['P-256', 'P-384', 'P-521'] as const
export const HASHES = ['SHA-256', 'SHA-384', 'SHA-512'] as const

/** 各曲线签名中的单个整数长度（字节）；签名 = r‖s，长度翻倍 */
const COORDINATE_BYTES: Record<string, number> = { 'P-256': 32, 'P-384': 48, 'P-521': 66 }

/**
 * 演示用固定密钥对（P-256，PKCS#8 / SPKI PEM）。
 * ECDSA 签名含随机 nonce，**不是确定性的**——固定密钥只保证「能签能验」，
 * 单测里靠签后再验签来断言，不硬比对签名值。
 */
export const DEMO_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE/p9ZFnRDBzWiLSQDANABjlTH3bxo
U4Wb8pn7OxbHdsvyDulr/bdkfjb/e+oKLV/OOP9snpcBBMF592NLb0HfJw==
-----END PUBLIC KEY-----
`

export const DEMO_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgnJXh8IvtJ6PLL1pk
+Ue5JK9C+O7yS86QcRNkMZXKeyShRANCAAT+n1kWdEMHNaItJAMA0AGOVMfdvGhT
hZvymfs7Fsd2y/IO6Wv9t2R+Nv976gotX844/2yelwEEwXn3Y0tvQd8n
-----END PRIVATE KEY-----
`

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

/** 字节 → 标准 Base64 */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** 字节 → 十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 按选项编码字节 */
export function encodeBytes(bytes: Uint8Array, options: EcdsaOptions): string {
  return options.encoding === 'hex' ? toHex(bytes) : toBase64(bytes)
}

/** Base64 或十六进制 → 字节 */
export function decodeValue(value: string, encoding: 'base64' | 'hex'): Bytes {
  const cleaned = value.replace(/\s+/g, '')
  if (encoding === 'hex') {
    if (!/^[0-9a-fA-F]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
      throw new Error('十六进制格式不正确：应为偶数个 0-9 / a-f 字符')
    }
    const bytes = new Uint8Array(new ArrayBuffer(cleaned.length / 2))
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
  }
  let binary: string
  try {
    binary = atob(cleaned)
  } catch {
    throw new Error('Base64 格式不正确：无法解码')
  }
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** PEM → DER */
export function pemToDer(pem: string): Bytes {
  if (pem.trim() === '') throw new Error('密钥为空：请粘贴 PEM 格式的公钥或私钥')
  if (!/-----BEGIN [^-]+-----/.test(pem)) {
    throw new Error('密钥不是合法的 PEM：缺少 -----BEGIN ...----- 标记')
  }
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  let binary: string
  try {
    binary = atob(body)
  } catch {
    throw new Error('密钥不是合法的 PEM：Base64 解码失败')
  }
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 曲线与摘要取值校验 */
export function requireOption(value: string, allowed: readonly string[], label: string): string {
  if (!allowed.includes(value)) throw new Error(`不支持的${label}：${value}`)
  return value
}

/** 该曲线上签名的字节长度（r‖s） */
export function signatureLength(curve: string): number {
  return (COORDINATE_BYTES[requireOption(curve, CURVES, '曲线')] ?? 32) * 2
}

/** ECDSA 签名：输出原始 r‖s（不是 DER） */
export async function sign(
  text: string,
  privateKeyPem: string,
  options: EcdsaOptions,
): Promise<string> {
  if (privateKeyPem.trim() === '') throw new Error('请先粘贴私钥（PEM）')
  const curve = requireOption(options.curve, CURVES, '曲线')
  const hash = requireOption(options.hash, HASHES, '摘要')
  const key = await webcrypto().importKey(
    'pkcs8',
    pemToDer(privateKeyPem),
    { name: 'ECDSA', namedCurve: curve },
    true,
    ['sign'],
  )
  const signature = await webcrypto().sign(
    { name: 'ECDSA', hash: { name: hash } },
    key,
    new TextEncoder().encode(text),
  )
  return encodeBytes(new Uint8Array(signature), options)
}

/** ECDSA 验签：返回结论文案，不抛错（验签失败是正常结果） */
export async function verify(
  text: string,
  signatureValue: string,
  publicKeyPem: string,
  options: EcdsaOptions,
): Promise<string> {
  if (signatureValue.trim() === '') throw new Error('验签需要填入签名（与签名时相同的编码）')
  if (publicKeyPem.trim() === '') throw new Error('请先粘贴公钥（PEM）')
  const curve = requireOption(options.curve, CURVES, '曲线')
  const hash = requireOption(options.hash, HASHES, '摘要')
  const key = await webcrypto().importKey(
    'spki',
    pemToDer(publicKeyPem),
    { name: 'ECDSA', namedCurve: curve },
    true,
    ['verify'],
  )
  // 签名编码错误属于输入错误，如实抛出；只有签名不匹配才算验签失败
  const signature = decodeValue(signatureValue, options.encoding)
  let ok: boolean
  try {
    ok = await webcrypto().verify(
      { name: 'ECDSA', hash: { name: hash } },
      key,
      signature,
      new TextEncoder().encode(text),
    )
  } catch {
    ok = false
  }
  return ok ? '验签通过：签名与数据、公钥匹配' : '验签失败：签名与数据或公钥不匹配'
}

export async function transform(input: EcdsaInput, options: EcdsaOptions): Promise<string> {
  if (input.text === '') return ''
  if (options.direction === 'sign') return sign(input.text, input.privateKey, options)
  return verify(input.text, input.signature, input.publicKey, options)
}
