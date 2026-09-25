import type { EccInput, EccOptions } from './schema'

/** 字节类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/** 分块大小：避免 String.fromCharCode(...) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** WebCrypto 支持的 NIST 曲线 */
export const CURVES = ['P-256', 'P-384', 'P-521'] as const

/**
 * 演示用固定密钥对（P-256）。
 * 只用于「示例」与单测：ECDH 协商结果是确定性的，固定密钥才能得到可断言的共享密钥。
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

/** DER → PEM：base64 按 64 字符分行并包上头尾 */
export function derToPem(der: ArrayBuffer, label: string): string {
  const lines = toBase64(new Uint8Array(der)).match(/.{1,64}/g) ?? []
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`
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

/** 校验曲线取值，非法值直接报错而不是静默兜底 */
export function requireCurve(curve: string): string {
  if (!(CURVES as readonly string[]).includes(curve)) {
    throw new Error('不支持的曲线：' + curve + '（可选 P-256 / P-384 / P-521）')
  }
  return curve
}

/** 生成 ECDH 密钥对，返回两份 PEM */
export async function generateKeyPair(
  curve: string,
): Promise<{ publicKey: string; privateKey: string }> {
  const subtle = webcrypto()
  const pair = (await subtle.generateKey({ name: 'ECDH', namedCurve: requireCurve(curve) }, true, [
    'deriveBits',
  ])) as CryptoKeyPair
  return {
    publicKey: derToPem(await subtle.exportKey('spki', pair.publicKey), 'PUBLIC KEY'),
    privateKey: derToPem(await subtle.exportKey('pkcs8', pair.privateKey), 'PRIVATE KEY'),
  }
}

/**
 * ECDH 协商：己方私钥 + 对方公钥 → 原始共享密钥（Z）。
 * 真实场景里应再过一遍 HKDF 才当对称密钥用，这里如实输出原始 Z 以便对照其它实现。
 */
export async function deriveSharedSecret(
  privateKeyPem: string,
  publicKeyPem: string,
  curve: string,
): Promise<Uint8Array> {
  const namedCurve = requireCurve(curve)
  const subtle = webcrypto()
  const privateKey = await subtle.importKey(
    'pkcs8',
    pemToDer(privateKeyPem),
    { name: 'ECDH', namedCurve },
    true,
    ['deriveBits'],
  )
  const publicKey = await subtle.importKey(
    'spki',
    pemToDer(publicKeyPem),
    { name: 'ECDH', namedCurve },
    true,
    [],
  )
  const bits = await subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    curve === 'P-256' ? 256 : curve === 'P-384' ? 384 : 528,
  )
  return new Uint8Array(bits)
}

/** 按选项编码共享密钥 */
function encode(bytes: Uint8Array, options: EccOptions): string {
  return options.encoding === 'hex' ? toHex(bytes) : toBase64(bytes)
}

export async function transform(input: EccInput, options: EccOptions): Promise<string> {
  if (input.text === '') return ''
  if (options.direction === 'generate') {
    const pair = await generateKeyPair(options.curve)
    return `----- 公钥（发给对方）-----\n${pair.publicKey}\n----- 私钥（自己保留）-----\n${pair.privateKey}`
  }
  if (input.privateKey.trim() === '') throw new Error('请先粘贴己方私钥（PEM）')
  if (input.publicKey.trim() === '') throw new Error('请先粘贴对方公钥（PEM）')
  return encode(await deriveSharedSecret(input.privateKey, input.publicKey, options.curve), options)
}
