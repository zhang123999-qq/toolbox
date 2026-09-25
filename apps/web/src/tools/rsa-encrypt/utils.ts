import type { RsaInput, RsaOptions } from './schema'

/** 字节类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/** 分块大小：避免 String.fromCharCode(...) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/**
 * 演示用固定密钥对（2048 位 RSA，PKCS#8 / SPKI PEM）。
 * 只用于「示例」与单测——RSASSA-PKCS1-v1_5 签名是确定性的，
 * 固定密钥才能得到可断言的结果。**不要拿它处理真实数据。**
 */
export const DEMO_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsg8V7/WkgsFfVxVbQEXX
Jgv9bJUt0Qh6NQyzpOPOK5KKst24ynuGBTKXniX1p1Yl3WiwDy0JXIJZscGOxWxQ
4WpSWX9f4UL2BpIr4Q3wMmW/YSM/9K0ZB6RtTxSPw8YnFnNQVfvkFGRDsqQCXqvz
1PrOK3VrlyYLlFXXz/iuKaojLIkX3Q0/W7dXRjR81EwnOFVOsTKYvEytsDV9S5xb
dqKHo1gH5iGrDreuHyoaLMoUMN3RXH4GuNKMlqx9IMdnqk0YfGhtUVD1+2v8bvY5
1FYYjrHRErlAeyljnLYV/Mcc2TFkv6R+AJgZlYfvRozI7bfZaFkuCDYW6hVhKoCo
GwIDAQAB
-----END PUBLIC KEY-----
`

export const DEMO_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCyDxXv9aSCwV9X
FVtARdcmC/1slS3RCHo1DLOk484rkoqy3bjKe4YFMpeeJfWnViXdaLAPLQlcglmx
wY7FbFDhalJZf1/hQvYGkivhDfAyZb9hIz/0rRkHpG1PFI/DxicWc1BV++QUZEOy
pAJeq/PU+s4rdWuXJguUVdfP+K4pqiMsiRfdDT9bt1dGNHzUTCc4VU6xMpi8TK2w
NX1LnFt2ooejWAfmIasOt64fKhosyhQw3dFcfga40oyWrH0gx2eqTRh8aG1RUPX7
a/xu9jnUVhiOsdESuUB7KWOcthX8xxzZMWS/pH4AmBmVh+9GjMjtt9loWS4INhbq
FWEqgKgbAgMBAAECggEAApXMfDzlRA65qyKAviilbIR9C/AIh8HnQFDsZMb37dMF
V353mdz8P6QR5nZnoCPUjefgsn+1ZJXx5m5Ie95MOFGaW3lJc5RMzSCfKXfR1nF6
u1bPLWa798vv2FeUlMOSOrW242CyWYdxIi1WaXh2pE914dSlGL8xKNisNvVF1g3/
iMySnmoGlVXI/qR8U1lZgr45FamBb5cdnLCnhxentjeztLDa73mJmNWq5T3DVPpe
DqKlSYo2kMqQtwAbS5UvWoNzrDWRnIGWzezVqvV0+7UdqxqJVwXXmo3HnYR8zHOS
FNCK2Cpz+5kkcb8CIGJkJ0fb/D/KDrrAV6z1RyPVsQKBgQD6C59ZX12ChcH89GSG
iKhYWDhVVswsW8hkf8FyWUluYZwgBmXu24T1P/X5/VcY1KrcFjOw5f62BYMUX3Qk
FCsPQeF2WjmcByEFl1cDn0dOyhFvFUtrRJNoSn4/tz93OHNollnIn5eoT/0voOL0
MegSDTUJQjW5izZ2a30UwxtDawKBgQC2TJrM43uK9vPIyJpLoOGXsgr+fvdqEHX4
y8HfsqUJ55Q2zz3NFLVxgO4rWGYFUKtiWBZwluroCgshKSSgsyhElFPoLWr/i8gA
qiG6Cz54pmymL8KP5Tyt+jesOWEC3pgrE7mz4UgeuQvnKR8pyhyzMtYlivU7CpHV
650E8e0KEQKBgQDcZng8B+Jd1Vbrh+Q/7Z8t1/03w71OcEyPwUibaXZfdGxwkhMx
Wo+0uX8wro0iFvrP6kX/7Ir6mJs0zvqJfrmBxllcwCS9kk8aJY8OY0wwd86sMoH6
+ERSji8ALJ8lkD2x960GOR4tvuv2GoNSKddcagXQtmqytLH56b8kGOIkJwKBgB5H
KOrg2ZMiIyl1EBOBnBZ67tKIOgW2yDFTflbuL/UuLnLQBv658szwUh6G5yL43A5Q
fSGkH0385Q5T7A540zZYwHrumDfreoOJvmJNHcoiMieEBTerJmHrDjYfrZoxaGq3
Mv/KahUYPP7e2JszQ4ML7X98zfBJeCFkqca5e9pRAn9z8mBQmVAYHe7Q71ei7Z8s
pwdXTYhHaDrz9r+jRgDdi2u5Oc9/zS8KymDgf35QeYLoWqulsCx52hjP7pVHIy+X
V1CZRWXpGiqL0RJtfp5W8PTCSL/yTxaHYIT8DvWBsbZdsIOArpDC1gU2pRRunXhg
oMxTywff9wYFNRxw4YRg
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

/**
 * PEM → DER：取出 BEGIN / END 之间的 Base64 解码即可。
 * 宽容处理：忽略空行、行尾空白，以及常见复制粘贴带来的 `-----BEGIN RSA PUBLIC KEY-----` 变体。
 */
export function pemToDer(pem: string): Bytes {
  if (pem.trim() === '') throw new Error('密钥为空：请粘贴 PEM 格式的公钥或私钥')
  if (!/-----BEGIN [^-]+-----/.test(pem)) {
    throw new Error('密钥不是合法的 PEM：缺少 -----BEGIN ...----- 标记')
  }
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  if (body === '') throw new Error('密钥为空：请粘贴 PEM 格式的公钥或私钥')
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

/** Base64 或十六进制 → 字节（解密 / 验签时读取密文与签名） */
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

/** 导入公钥（SPKI PEM） */
export async function importPublicKey(
  pem: string,
  algorithm: AlgorithmIdentifier | RsaHashedImportParams,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return webcrypto().importKey('spki', pemToDer(pem), algorithm, true, usages)
}

/** 导入私钥（PKCS#8 PEM） */
export async function importPrivateKey(
  pem: string,
  algorithm: AlgorithmIdentifier | RsaHashedImportParams,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return webcrypto().importKey('pkcs8', pemToDer(pem), algorithm, true, usages)
}

/** UTF-8 文本 → 字节（拷贝一份，确保底层是 ArrayBuffer 而非 SharedArrayBuffer） */
function encodeText(text: string): Bytes {
  return new Uint8Array(new TextEncoder().encode(text))
}

/** 按选项把字节编码成文本 */
function encodeBytes(bytes: Uint8Array, options: RsaOptions): string {
  return options.encoding === 'hex' ? toHex(bytes) : toBase64(bytes)
}

function requireKey(value: string, which: string): string {
  if (value.trim() === '') throw new Error(`请先粘贴${which}（PEM 格式）`)
  return value
}

/** RSA-OAEP 加密：输出密文的 base64 / hex */
export async function encrypt(
  text: string,
  publicKeyPem: string,
  options: RsaOptions,
): Promise<string> {
  const key = await importPublicKey(
    requireKey(publicKeyPem, '公钥'),
    { name: 'RSA-OAEP', hash: options.hash },
    ['encrypt'],
  )
  const cipher = await webcrypto().encrypt({ name: 'RSA-OAEP' }, key, encodeText(text))
  return encodeBytes(new Uint8Array(cipher), options)
}

/** RSA-OAEP 解密：输入密文的 base64 / hex，输出明文 */
export async function decrypt(
  value: string,
  privateKeyPem: string,
  options: RsaOptions,
): Promise<string> {
  const key = await importPrivateKey(
    requireKey(privateKeyPem, '私钥'),
    { name: 'RSA-OAEP', hash: options.hash },
    ['decrypt'],
  )
  const plain = await webcrypto().decrypt(
    { name: 'RSA-OAEP' },
    key,
    decodeValue(value, options.encoding),
  )
  return new TextDecoder('utf-8', { fatal: true }).decode(plain)
}

/** RSASSA-PKCS1-v1_5 签名（确定性，同样的密钥与数据总是得到同样的签名） */
export async function sign(
  text: string,
  privateKeyPem: string,
  options: RsaOptions,
): Promise<string> {
  const key = await importPrivateKey(
    requireKey(privateKeyPem, '私钥'),
    { name: 'RSASSA-PKCS1-v1_5', hash: options.hash },
    ['sign'],
  )
  const signature = await webcrypto().sign({ name: 'RSASSA-PKCS1-v1_5' }, key, encodeText(text))
  return encodeBytes(new Uint8Array(signature), options)
}

/** RSASSA-PKCS1-v1_5 验签：返回结论文案，不抛错（验签失败是正常结果而不是异常） */
export async function verify(
  text: string,
  signatureValue: string,
  publicKeyPem: string,
  options: RsaOptions,
): Promise<string> {
  if (signatureValue.trim() === '') throw new Error('验签需要填入签名（与签名时相同的编码）')
  const key = await importPublicKey(
    requireKey(publicKeyPem, '公钥'),
    { name: 'RSASSA-PKCS1-v1_5', hash: options.hash },
    ['verify'],
  )
  let ok: boolean
  try {
    ok = await webcrypto().verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      decodeValue(signatureValue, options.encoding),
      encodeText(text),
    )
  } catch {
    ok = false
  }
  return ok ? '验签通过：签名与数据、公钥匹配' : '验签失败：签名与数据或公钥不匹配'
}

export async function transform(input: RsaInput, options: RsaOptions): Promise<string> {
  if (input.text === '') return ''
  if (options.direction === 'encrypt') return encrypt(input.text, input.publicKey, options)
  if (options.direction === 'decrypt') return decrypt(input.text, input.privateKey, options)
  if (options.direction === 'sign') return sign(input.text, input.privateKey, options)
  return verify(input.text, input.signature, input.publicKey, options)
}
