import { jwtVerify } from 'jose'
import type { JwsParseInput, JwsParseOptions } from './schema'

/** 支持的算法（与 schema、Tool.tsx 保持一致） */
export const ALGORITHMS = ['HS256', 'HS384', 'HS512'] as const

/** 算法白名单校验：alg 只认这三种，避免 alg=none / 算法混淆 */
export function requireAlgorithm(algorithm: string): string {
  if (!(ALGORITHMS as readonly string[]).includes(algorithm)) {
    throw new Error('不支持的算法：' + algorithm + '（可选 HS256 / HS384 / HS512）')
  }
  return algorithm
}

/** 字节类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/** 算法 → 摘要 */
export const HASH_BY_ALGORITHM: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

/** 密钥校验：与生成侧保持同一口径（≥ 16 字符） */
export function requireSecret(secret: string): Bytes {
  if (secret === '') throw new Error('请先填写密钥（与签名时相同的 HMAC 密钥）')
  if (secret.length < 16) throw new Error('密钥太短：HMAC 密钥建议至少 16 个字符')
  return new Uint8Array(new TextEncoder().encode(secret))
}

/**
 * 导入验签用的 HMAC 密钥（CryptoKey）。
 * 用 CryptoKey 而不是裸字节：jose 对 key 做 `instanceof` 校验，jsdom 与 Node 的
 * Uint8Array 不在同一 realm，裸字节在组件测试里会被判成「不是 Uint8Array」。
 */
export async function importHmacKey(secret: string, algorithm: string): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle.importKey(
    'raw',
    requireSecret(secret),
    { name: 'HMAC', hash: HASH_BY_ALGORITHM[requireAlgorithm(algorithm)] ?? 'SHA-256' },
    true,
    ['verify'],
  )
}

export interface VerifyResult {
  readonly valid: boolean
  readonly header: unknown
  readonly payload: unknown
  /** 验签失败的原因（成功时为空串） */
  readonly reason: string
}

/**
 * 验签。
 * 失败**不抛错**：验签失败是本次调用的正常结论，只有「格式不对 / 缺密钥」才算输入错误。
 */
export async function verifyJws(
  token: string,
  secret: string,
  algorithm: string,
): Promise<VerifyResult> {
  const key = await importHmacKey(secret, algorithm)
  const alg = requireAlgorithm(algorithm)
  const trimmed = token.trim()
  if (trimmed.split('.').length !== 3) {
    throw new Error('不是合法的 JWS：应由 3 段组成（header.payload.signature）')
  }
  try {
    const { protectedHeader, payload } = await jwtVerify(trimmed, key, { algorithms: [alg] })
    return { valid: true, header: protectedHeader, payload, reason: '' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { valid: false, header: null, payload: null, reason: describeFailure(message) }
  }
}

/** jose 的英文报错 → 人能读的中文原因 */
export function describeFailure(message: string): string {
  if (/signature verification failed/i.test(message)) return '签名不匹配：密钥不对或内容被改过'
  if (/"alg"/i.test(message) && /not allowed|unsupported/i.test(message)) {
    return '算法不匹配：header 里的 alg 与所选算法不一致'
  }
  if (/exp/i.test(message)) return '令牌已过期（exp 早于当前时间）'
  if (/nbf/i.test(message)) return '令牌尚未生效（nbf 晚于当前时间）'
  if (/aud/i.test(message)) return '受众不匹配（aud 校验失败）'
  if (/iss/i.test(message)) return '签发者不匹配（iss 校验失败）'
  return '验签失败：' + message
}

/** 输出：结论 + Header / Payload */
export function formatResult(result: VerifyResult): string {
  const head = result.valid ? '验签通过：签名与密钥匹配' : '验签失败：' + result.reason
  const body = JSON.stringify({ header: result.header, payload: result.payload }, null, 2)
  return result.valid ? `${head}\n\n${body}` : head
}

export async function transform(input: JwsParseInput, options: JwsParseOptions): Promise<string> {
  if (input.text.trim() === '') return ''
  return formatResult(await verifyJws(input.text, input.secret, options.algorithm))
}
