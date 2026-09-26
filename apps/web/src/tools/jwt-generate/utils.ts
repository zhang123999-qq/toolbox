import { SignJWT } from 'jose'
import type { JwtGenerateInput, JwtGenerateOptions } from './schema'

/** 支持的算法（与 schema、Tool.tsx 保持一致） */
export const ALGORITHMS = ['HS256', 'HS384', 'HS512'] as const

/**
 * payload 必须是 JSON 对象：JWT 规范里 payload 是一个 JSON 对象，
 * 数组 / 字符串虽然能被 base64url 编码，但几乎所有校验库都会拒绝。
 */
export function parsePayload(text: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error('Payload 不是合法的 JSON：' + (error as Error).message, { cause: error })
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Payload 必须是 JSON 对象（如 {"sub":"123"}），不能是数组或标量')
  }
  return parsed as Record<string, unknown>
}

/** 字节类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/** 算法 → 摘要 */
export const HASH_BY_ALGORITHM: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

/** 密钥不能为空：HS256 允许短密钥但那样毫无安全性可言 */
export function requireSecret(secret: string): Bytes {
  if (secret === '') throw new Error('请先填写密钥（HMAC 密钥，任意长度字符串）')
  if (secret.length < 16) {
    throw new Error('密钥太短：HMAC 密钥建议至少 16 个字符，当前 ' + secret.length + ' 个')
  }
  return new Uint8Array(new TextEncoder().encode(secret))
}

/** 校验算法取值 */
export function requireAlgorithm(algorithm: string): string {
  if (!(ALGORITHMS as readonly string[]).includes(algorithm)) {
    throw new Error('不支持的算法：' + algorithm + '（可选 HS256 / HS384 / HS512）')
  }
  return algorithm
}

/**
 * 导入 HMAC 密钥。
 * 导出成 CryptoKey 而不是裸字节：jose 对 key 做 `instanceof` 校验，
 * 而 jsdom 与 Node 的 Uint8Array 不在同一个 realm，裸字节在组件测试里会被判成「不是 Uint8Array」。
 */
export async function importHmacKey(secret: string, algorithm: string): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）')
  return subtle.importKey(
    'raw',
    requireSecret(secret),
    { name: 'HMAC', hash: HASH_BY_ALGORITHM[requireAlgorithm(algorithm)] ?? 'SHA-256' },
    true,
    ['sign'],
  )
}

/**
 * 生成 JWT。
 * 刻意**不自动写入 iat / exp**：一来这些属于业务决策，二来写入当前时间会让同一份输入
 * 每次产出不同令牌，示例与单测都无法复现。需要过期时间请自己写进 payload。
 */
export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  algorithm: string,
): Promise<string> {
  const key = await importHmacKey(secret, algorithm)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: requireAlgorithm(algorithm), typ: 'JWT' })
    .sign(key)
}

export async function transform(
  input: JwtGenerateInput,
  options: JwtGenerateOptions,
): Promise<string> {
  if (input.text.trim() === '') return ''
  return signJwt(parsePayload(input.text), input.secret, options.algorithm)
}
