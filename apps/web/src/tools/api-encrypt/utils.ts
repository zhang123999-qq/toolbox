/**
 * api-encrypt（#758）纯函数：PBKDF2 + AES-GCM 文本加解密。
 * C 级工具：使用浏览器 / Node 内置 WebCrypto，无第三方 API。
 * 密码只存放在调用方内存中，本模块不做任何持久化。
 */

/** WebCrypto 最小接口（便于注入；测试用 Node 真实 webcrypto） */
export interface AesSubtleLike {
  importKey(
    format: 'raw',
    keyData: Uint8Array,
    algorithm: { name: string },
    extractable: boolean,
    keyUsages: string[],
  ): Promise<unknown>
  deriveKey(
    algorithm: { name: string; salt: Uint8Array; iterations: number; hash: { name: string } },
    baseKey: unknown,
    derivedKeyType: { name: string; length: number },
    extractable: boolean,
    keyUsages: string[],
  ): Promise<unknown>
  encrypt(algorithm: { name: string; iv: Uint8Array }, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
  decrypt(algorithm: { name: string; iv: Uint8Array }, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
}

/** 默认 subtle：浏览器 / Node 内置 WebCrypto（仅在运行时调用） */
export function defaultAesSubtle(): AesSubtleLike {
  const c = globalThis.crypto
  if (!c || !c.subtle) throw new Error('当前环境不支持 WebCrypto')
  return c.subtle as unknown as AesSubtleLike
}

/** 随机源最小接口（便于注入确定性向量） */
export interface RandomLike {
  getRandomValues(arr: Uint8Array): Uint8Array
}

/** 默认随机源：浏览器 / Node 内置 crypto（仅在运行时调用） */
export function defaultRandom(): RandomLike {
  const c = globalThis.crypto
  if (!c || typeof c.getRandomValues !== 'function') throw new Error('当前环境不支持 WebCrypto')
  return c as unknown as RandomLike
}

export const PBKDF2_ITERATIONS = 100000
export const SALT_BYTES = 16
export const IV_BYTES = 12

export interface EncryptedPayload {
  v: 1
  kdf: 'PBKDF2-SHA256'
  iter: number
  salt: string
  iv: string
  data: string
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** 字节转 base64 */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

/** base64 转字节（非法抛中文错） */
export function base64ToBytes(field: string, b64: string): Uint8Array {
  if (b64.length % 4 !== 0 || !BASE64_RE.test(b64)) {
    throw new Error('字段 ' + field + ' 不是合法 Base64')
  }
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function randomBytes(n: number, random: RandomLike): Uint8Array {
  const arr = new Uint8Array(n)
  random.getRandomValues(arr)
  return arr
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  subtle: AesSubtleLike,
): Promise<unknown> {
  const baseKey = await subtle.importKey('raw', utf8(password), { name: 'PBKDF2' }, false, [
    'deriveKey',
  ])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: { name: 'SHA-256' } },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptOptions {
  plaintext: string
  password: string
  /** 固定 salt（测试向量用；缺省随机 16 字节） */
  salt?: Uint8Array
  /** 固定 iv（测试向量用；缺省随机 12 字节） */
  iv?: Uint8Array
  iterations?: number
}

export interface CryptoDeps {
  subtle?: AesSubtleLike
  random?: RandomLike
}

/** 加密：PBKDF2 派生 AES-GCM 256 密钥，输出 JSON 载荷 */
export async function encryptText(
  opts: EncryptOptions,
  deps: CryptoDeps = {},
): Promise<string> {
  if (opts.plaintext === '') throw new Error('请输入要加密的内容')
  if (opts.password === '') throw new Error('请输入密码')
  const subtle = deps.subtle ?? defaultAesSubtle()
  const random = deps.random ?? defaultRandom()
  const iterations = opts.iterations ?? PBKDF2_ITERATIONS
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('迭代次数必须是正整数')
  const salt = opts.salt ?? randomBytes(SALT_BYTES, random)
  const iv = opts.iv ?? randomBytes(IV_BYTES, random)
  const key = await deriveAesKey(opts.password, salt, iterations, subtle)
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(opts.plaintext))
  const payload: EncryptedPayload = {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ct)),
  }
  return JSON.stringify(payload)
}

/** 解析并校验载荷 */
export function parsePayload(json: string): EncryptedPayload {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('载荷不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('载荷必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  for (const field of ['salt', 'iv', 'data'] as const) {
    if (typeof o[field] !== 'string' || (o[field] as string) === '') {
      throw new Error('载荷缺少字段：' + field)
    }
  }
  const iter = typeof o.iter === 'number' ? o.iter : PBKDF2_ITERATIONS
  if (!Number.isInteger(iter) || iter <= 0) throw new Error('载荷迭代次数非法')
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter,
    salt: o.salt as string,
    iv: o.iv as string,
    data: o.data as string,
  }
}

/** 解密：密码错误或数据损坏抛中文错 */
export async function decryptText(
  payloadJson: string,
  password: string,
  subtle?: AesSubtleLike,
): Promise<string> {
  if (password === '') throw new Error('请输入密码')
  const s = subtle ?? defaultAesSubtle()
  const p = parsePayload(payloadJson)
  const salt = base64ToBytes('salt', p.salt)
  const iv = base64ToBytes('iv', p.iv)
  const data = base64ToBytes('data', p.data)
  const key = await deriveAesKey(password, salt, p.iter, s)
  try {
    const pt = await s.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(pt)
  } catch {
    throw new Error('解密失败：密码错误或数据已损坏')
  }
}
