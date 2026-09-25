import type { SshKeyInput, SshKeyOptions } from './schema'

/** 支持的算法：曲线 ed25519 与 RSA 家族 */
export const ALGORITHMS = ['ed25519', 'rsa'] as const

/** RSA 支持的位数 */
export const RSA_BITS = ['2048', '3072', '4096'] as const

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 字节 → 标准 Base64（RSA 4096 的 PKCS#8 有 2 KB+，必须分块） */
export function base64FromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** base64url（JWK 里的 n / e）→ 字节 */
export function bytesFromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  const binary = atob(normalized + '='.repeat(padding))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 多段字节拼接 */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** SSH 线格式字符串：4 字节大端长度 + 内容 */
export function encodeSshString(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length)
  new DataView(out.buffer).setUint32(0, bytes.length, false)
  out.set(bytes, 4)
  return out
}

/** SSH mpint：去掉多余前导零，最高位为 1 时补 0x00，再按字符串包装 */
export function encodeMpint(bytes: Uint8Array): Uint8Array {
  let start = 0
  while (start < bytes.length - 1 && bytes[start] === 0) start += 1
  const body: number[] = []
  for (let i = start; i < bytes.length; i += 1) body.push(bytes[i])
  if (body.length === 0) body.push(0)
  if (body[0] & 0x80) body.unshift(0)
  return encodeSshString(Uint8Array.from(body))
}

/** 注释为空时不追加尾随空格 */
function withComment(prefix: string, comment: string): string {
  return comment === '' ? prefix : prefix + ' ' + comment
}

/** ed25519 公钥（raw 32 字节）→ OpenSSH 单行公钥 */
export function formatEd25519PublicKey(raw: Uint8Array, comment: string): string {
  const blob = concat([
    encodeSshString(new TextEncoder().encode('ssh-ed25519')),
    encodeSshString(raw),
  ])
  return withComment('ssh-ed25519 ' + base64FromBytes(blob), comment)
}

/** RSA 公钥（n / e）→ OpenSSH 单行公钥 */
export function formatRsaPublicKey(n: Uint8Array, e: Uint8Array, comment: string): string {
  const blob = concat([
    encodeSshString(new TextEncoder().encode('ssh-rsa')),
    encodeMpint(e),
    encodeMpint(n),
  ])
  return withComment('ssh-rsa ' + base64FromBytes(blob), comment)
}

/** DER → PEM（Base64 每行 64 字符） */
export function toPem(der: Uint8Array, label: string): string {
  const lines = base64FromBytes(der).match(/.{1,64}/g) ?? []
  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join('\n')
}

function webcrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle
}

interface KeyMaterial {
  readonly publicKey: string
  readonly privateKeyPem: string
}

/** ed25519：raw 导出公钥（32 字节），PKCS#8 导出私钥 */
async function generateEd25519(comment: string): Promise<KeyMaterial> {
  const subtle = webcrypto()
  let pair: CryptoKeyPair
  try {
    pair = (await subtle.generateKey({ name: 'Ed25519' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair
  } catch {
    throw new Error('当前环境的 WebCrypto 不支持 Ed25519，请把算法切换为 RSA')
  }
  const raw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey))
  const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey))
  return {
    publicKey: formatEd25519PublicKey(raw, comment),
    privateKeyPem: toPem(pkcs8, 'PRIVATE KEY'),
  }
}

/** RSA：JWK 里的 n / e 就是 SSH 公钥需要的两段 mpint */
async function generateRsa(comment: string, bits: number): Promise<KeyMaterial> {
  const subtle = webcrypto()
  const pair = (await subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: bits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair
  const jwk = (await subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey
  if (!jwk.n || !jwk.e) throw new Error('导出 RSA 公钥失败：JWK 里没有 n / e')
  const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey))
  return {
    publicKey: formatRsaPublicKey(bytesFromBase64Url(jwk.n), bytesFromBase64Url(jwk.e), comment),
    privateKeyPem: toPem(pkcs8, 'PRIVATE KEY'),
  }
}

/** 生成密钥对并拼成「公钥 + 私钥」的可读文本 */
export async function generateKeyPair(comment: string, options: SshKeyOptions): Promise<string> {
  const material =
    options.algorithm === 'rsa'
      ? await generateRsa(comment, Number(options.bits))
      : await generateEd25519(comment)
  return [
    '# 公钥（OpenSSH 格式，可追加到 ~/.ssh/authorized_keys）',
    material.publicKey,
    '',
    '# 私钥（PKCS#8 PEM，明文，仅供测试，切勿用于生产环境）',
    material.privateKeyPem,
  ].join('\n')
}

/**
 * 输入框内容 = 公钥末尾的注释（comment）。
 * 输入为空串时直接返回空串，**不会**触碰 WebCrypto，
 * 这样 SSG 预渲染与首次进入页面都不会烘焙出随机密钥。
 */
export async function transform(input: SshKeyInput, options: SshKeyOptions): Promise<string> {
  const comment = input.text.trim()
  if (comment === '') return ''
  if (/\s/.test(comment)) {
    throw new Error('注释里不能有空白字符：输入框内容会原样写进公钥末尾的注释位')
  }
  if (!(RSA_BITS as readonly string[]).includes(options.bits)) {
    throw new Error('不支持的 RSA 位数：' + options.bits)
  }
  if (!(ALGORITHMS as readonly string[]).includes(options.algorithm)) {
    throw new Error('不支持的算法：' + options.algorithm)
  }
  return generateKeyPair(comment, options)
}
