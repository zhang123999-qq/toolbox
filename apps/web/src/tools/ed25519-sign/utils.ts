import type { Ed25519Input, Ed25519Options } from './schema'

/** 字节类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/** 分块大小：避免 String.fromCharCode(...) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/**
 * 演示用固定密钥对（Ed25519）。
 * Ed25519 签名是确定性的（RFC 8032），固定密钥才能得到可断言的结果。
 */
export const DEMO_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAU3L3fhc2Xv1W2238iyiP/zkcSHkdzuwpif+tGyXQpY8=
-----END PUBLIC KEY-----
`

export const DEMO_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIO91iKeXccsZO3ei87GsFVA3VdUv+M798ZtdJL3XUOed
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

/** Base64 或十六进制 → 字节（验签时读取签名） */
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

/** Ed25519 签名（RFC 8032 确定性，同样的密钥与数据总是同一结果） */
export async function sign(
  text: string,
  privateKeyPem: string,
  options: Ed25519Options,
): Promise<string> {
  if (privateKeyPem.trim() === '') throw new Error('请先粘贴私钥（PEM）')
  const key = await webcrypto().importKey(
    'pkcs8',
    pemToDer(privateKeyPem),
    { name: 'Ed25519' },
    true,
    ['sign'],
  )
  const signature = await webcrypto().sign({ name: 'Ed25519' }, key, new TextEncoder().encode(text))
  return options.encoding === 'hex'
    ? toHex(new Uint8Array(signature))
    : toBase64(new Uint8Array(signature))
}

/** Ed25519 验签：返回结论文案，不抛错（验签失败是正常结果而不是异常） */
export async function verify(
  text: string,
  signatureValue: string,
  publicKeyPem: string,
  options: Ed25519Options,
): Promise<string> {
  if (signatureValue.trim() === '') throw new Error('验签需要填入签名（与签名时相同的编码）')
  if (publicKeyPem.trim() === '') throw new Error('请先粘贴公钥（PEM）')
  const key = await webcrypto().importKey(
    'spki',
    pemToDer(publicKeyPem),
    { name: 'Ed25519' },
    true,
    ['verify'],
  )
  // 签名编码错误是**输入错误**，要如实抛出；只有「签名本身不匹配」才算验签失败
  const signature = decodeValue(signatureValue, options.encoding)
  let ok: boolean
  try {
    ok = await webcrypto().verify(
      { name: 'Ed25519' },
      key,
      signature,
      new TextEncoder().encode(text),
    )
  } catch {
    ok = false
  }
  return ok ? '验签通过：签名与数据、公钥匹配' : '验签失败：签名与数据或公钥不匹配'
}

export async function transform(input: Ed25519Input, options: Ed25519Options): Promise<string> {
  if (input.text === '') return ''
  if (options.direction === 'sign') return sign(input.text, input.privateKey, options)
  return verify(input.text, input.signature, input.publicKey, options)
}
