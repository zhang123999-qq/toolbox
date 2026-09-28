/**
 * api-sign（#757）纯函数：HMAC-SHA256 接口签名生成与验签。
 * C 级工具：使用浏览器 / Node 内置 WebCrypto，无第三方 API。
 * 密钥只存放在调用方内存中，本模块不做任何持久化。
 */

/** WebCrypto 最小接口（便于注入；测试用 Node 真实 webcrypto） */
export interface SubtleLike {
  importKey(
    format: 'raw',
    keyData: Uint8Array,
    algorithm: { name: string; hash: { name: string } },
    extractable: boolean,
    keyUsages: string[],
  ): Promise<unknown>
  sign(algorithm: { name: string }, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
}

/** 默认 subtle：浏览器 / Node 内置 WebCrypto（仅在运行时调用） */
export function defaultSubtle(): SubtleLike {
  const c = globalThis.crypto
  if (!c || !c.subtle) throw new Error('当前环境不支持 WebCrypto')
  return c.subtle as unknown as SubtleLike
}

export type SignEncoding = 'hex' | 'base64'

export interface SignOptions {
  method: string
  path: string
  /** 待签参数（按 key 排序后拼接；缺省为空） */
  params?: Record<string, string>
  secret: string
  timestamp?: string
  nonce?: string
  encoding?: SignEncoding
  /** 自定义 stringToSign 模板，占位：{method} {path} {query} {timestamp} {nonce} */
  template?: string
}

export interface SignResult {
  stringToSign: string
  query: string
  timestamp: string
  nonce: string
  signatureHex: string
  signatureBase64: string
  /** 按所选 encoding 输出的签名 */
  signature: string
}

const TEMPLATE_KEYS = ['method', 'path', 'query', 'timestamp', 'nonce'] as const

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** 字节转 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 字节转 base64 */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** 参数按 key 排序拼接成 query 字符串 */
export function buildQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => k + '=' + params[k])
    .join('&')
}

/** 解析签名参数 JSON（对象，值转字符串） */
export function parseSignParams(json: string): Record<string, string> {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('参数不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('参数必须是 JSON 对象')
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = typeof v === 'string' ? v : String(v)
  }
  return out
}

export interface StringToSignInput {
  method: string
  path: string
  query: string
  timestamp: string
  nonce: string
  template?: string
}

/** 构建待签字符串（默认模板或自定义模板） */
export function buildStringToSign(input: StringToSignInput): string {
  const values: Record<string, string> = {
    method: input.method.toUpperCase(),
    path: input.path,
    query: input.query,
    timestamp: input.timestamp,
    nonce: input.nonce,
  }
  if (input.template === undefined) {
    return [values.method, values.path, values.query, values.timestamp, values.nonce].join('\n')
  }
  const tpl = input.template
  const found = tpl.match(/\{([a-z]+)\}/g) ?? []
  for (const m of found) {
    const key = m.slice(1, -1)
    if (!(TEMPLATE_KEYS as readonly string[]).includes(key)) {
      throw new Error('模板占位非法：' + m + '，可用 ' + TEMPLATE_KEYS.map((k) => '{' + k + '}').join(' '))
    }
  }
  return tpl.replace(/\{([a-z]+)\}/g, (_m, key: string) => values[key])
}

function assertSignOptions(opts: SignOptions): {
  method: string
  path: string
  timestamp: string
  nonce: string
  encoding: SignEncoding
} {
  if (typeof opts.secret !== 'string' || opts.secret === '') throw new Error('请输入签名密钥')
  const method = typeof opts.method === 'string' ? opts.method.trim().toUpperCase() : ''
  if (method === '') throw new Error('请输入请求方法')
  const path = typeof opts.path === 'string' ? opts.path.trim() : ''
  if (!path.startsWith('/')) throw new Error('path 必须以 / 开头')
  return {
    method,
    path,
    timestamp: opts.timestamp ?? String(Math.floor(Date.now() / 1000)),
    nonce: opts.nonce ?? Math.random().toString(36).slice(2),
    encoding: opts.encoding === 'base64' ? 'base64' : 'hex',
  }
}

async function hmacSha256(secret: string, message: string, subtle: SubtleLike): Promise<Uint8Array> {
  const key = await subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign'],
  )
  const sig = await subtle.sign({ name: 'HMAC' }, key, utf8(message))
  return new Uint8Array(sig)
}

/** 生成 HMAC-SHA256 接口签名 */
export async function signRequest(
  opts: SignOptions,
  subtle: SubtleLike = defaultSubtle(),
): Promise<SignResult> {
  const { method, path, timestamp, nonce, encoding } = assertSignOptions(opts)
  const query = buildQueryString(opts.params ?? {})
  const stringToSign = buildStringToSign({ method, path, query, timestamp, nonce, template: opts.template })
  const mac = await hmacSha256(opts.secret, stringToSign, subtle)
  const signatureHex = bytesToHex(mac)
  const signatureBase64 = bytesToBase64(mac)
  return {
    stringToSign,
    query,
    timestamp,
    nonce,
    signatureHex,
    signatureBase64,
    signature: encoding === 'base64' ? signatureBase64 : signatureHex,
  }
}

/** 验签：用相同参数重新计算并比对 */
export async function verifySignature(
  opts: SignOptions & { signature: string },
  subtle: SubtleLike = defaultSubtle(),
): Promise<boolean> {
  const r = await signRequest(opts, subtle)
  return opts.signature === r.signatureHex || opts.signature === r.signatureBase64
}
