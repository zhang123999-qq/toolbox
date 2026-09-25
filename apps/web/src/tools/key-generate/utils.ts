import type { KeyGenInput, KeyGenOptions } from './schema'

const MAX_LENGTH = 200000

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 可选值（与 schema、Tool.tsx 保持一致） */
export const TYPES = ['aes-hmac', 'rsa', 'ec', 'ed25519'] as const
export const BITS = ['128', '192', '256', '2048', '3072', '4096'] as const
export const CURVES = ['P-256', 'P-384', 'P-521', 'Ed25519'] as const
export const FORMATS = ['hex', 'base64', 'jwk', 'pem'] as const

/** 对称密钥（AES / HMAC）允许的位数 */
const SYMMETRIC_BITS = ['128', '192', '256']
/** RSA 模长允许的位数 */
const RSA_BITS = ['2048', '3072', '4096']
/** EC 的椭圆曲线（Ed25519 走单独算法） */
const EC_CURVES = ['P-256', 'P-384', 'P-521']

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

/** 字节转十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 字节转 base64 */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * DER → PEM：base64 按 64 字符分行，再包上 BEGIN/END 头尾。
 * 直接把 WebCrypto `exportKey('pkcs8' / 'spki')` 得到的 DER 包一层即可，不需要第三方库。
 */
export function derToPem(der: Uint8Array, label: string): string {
  const base64 = toBase64(der)
  const lines = base64.match(/.{1,64}/g) ?? []
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`
}

/** 按 hex / base64 编码字节 */
function encode(bytes: Uint8Array, format: string): string {
  if (format === 'hex') return toHex(bytes)
  if (format === 'base64') return toBase64(bytes)
  throw new Error(`不支持的输出格式：${format}`)
}

/** 对称密钥（AES 长度的 HMAC-SHA-256 密钥，导出原始字节 / oct JWK） */
async function generateSymmetric(options: KeyGenOptions): Promise<string> {
  if (!(SYMMETRIC_BITS as readonly string[]).includes(options.bits)) {
    throw new Error(`对称密钥长度只能是 128 / 192 / 256 位，当前是 ${options.bits}`)
  }
  const subtle = webcrypto()
  const key = await subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256', length: Number(options.bits) },
    true,
    ['sign', 'verify'],
  )
  if (options.format === 'jwk') {
    return JSON.stringify(await subtle.exportKey('jwk', key), null, 2)
  }
  if (options.format === 'pem') {
    throw new Error('对称密钥没有 PEM 形式，请选 hex / base64 / jwk')
  }
  const raw = new Uint8Array(await subtle.exportKey('raw', key))
  return encode(raw, options.format)
}

/** 非对称密钥对：输出私钥（hex / base64 / PEM 为 PKCS#8，jwk 为私钥+公钥两个 JWK） */
async function exportPair(pair: CryptoKeyPair, format: string): Promise<string> {
  const subtle = webcrypto()
  if (format === 'jwk') {
    const privateKey = await subtle.exportKey('jwk', pair.privateKey)
    const publicKey = await subtle.exportKey('jwk', pair.publicKey)
    return JSON.stringify({ privateKey, publicKey }, null, 2)
  }
  const der = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey))
  if (format === 'pem') return derToPem(der, 'PRIVATE KEY')
  return encode(der, format)
}

/** RSA 密钥对 */
async function generateRsa(options: KeyGenOptions): Promise<string> {
  if (!(RSA_BITS as readonly string[]).includes(options.bits)) {
    throw new Error(`RSA 模长只能是 2048 / 3072 / 4096 位，当前是 ${options.bits}`)
  }
  const pair = (await webcrypto().generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: Number(options.bits),
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair
  return exportPair(pair, options.format)
}

/** EC（ECDSA / P-256、P-384、P-521）密钥对 */
async function generateEc(options: KeyGenOptions): Promise<string> {
  if (!(EC_CURVES as readonly string[]).includes(options.curve)) {
    throw new Error(`EC 曲线请选 P-256 / P-384 / P-521，当前是 ${options.curve}`)
  }
  const pair = (await webcrypto().generateKey({ name: 'ECDSA', namedCurve: options.curve }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  return exportPair(pair, options.format)
}

/** Ed25519 密钥对 */
async function generateEd25519(options: KeyGenOptions): Promise<string> {
  const pair = (await webcrypto().generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  return exportPair(pair, options.format)
}

/** 按类型分发 */
export async function generate(options: KeyGenOptions): Promise<string> {
  if (options.type === 'aes-hmac') return generateSymmetric(options)
  if (options.type === 'rsa') return generateRsa(options)
  if (options.type === 'ec') return generateEc(options)
  return generateEd25519(options)
}

/**
 * 生成密钥。
 * 输入框只作「触发」用：空串返回空串（避免 SSG 预渲染时烘焙出一把随机密钥），
 * 填任意内容即触发一次生成。
 */
export async function transform(input: KeyGenInput, options: KeyGenOptions): Promise<string> {
  if (input.text === '') return ''
  if (input.text.length > MAX_LENGTH) throw new Error('输入超过 200,000 字符上限')
  return generate(options)
}
