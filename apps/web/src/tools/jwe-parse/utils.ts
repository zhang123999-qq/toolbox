import { compactDecrypt } from 'jose'
import type { JweParseInput, JweParseOptions } from './schema'

/** 字节类型：显式标成 ArrayBuffer 版本，才能直接交给 WebCrypto（BufferSource） */
type Bytes = Uint8Array<ArrayBuffer>

/**
 * 口令 → 对称密钥：SHA-256 得到 32 字节，正好是 A256GCM 需要的长度。
 * 生产环境请用 PBKDF2 / Argon2 之类的口令派生函数，这里取 SHA-256 是为了
 * 「同一个口令在任何地方都能算出同一把密钥」，方便对照与调试。
 */
export async function deriveKey(secret: string): Promise<Bytes> {
  if (secret === '') throw new Error('请先填写口令（与加密时相同的那一个）')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return new Uint8Array(digest)
}

/**
 * 派生结果导入成 AES-GCM 的 CryptoKey 再交给 jose。
 * 直接用裸字节在组件测试里会被 jose 判成「不是 Uint8Array」：
 * jsdom 与 Node 的 Uint8Array 不在同一个 realm，`instanceof` 校验过不去。
 */
export async function importAesKey(secret: string): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    await deriveKey(secret),
    { name: 'AES-GCM' },
    true,
    ['decrypt'],
  )
}

/** compact JWE 的形状：5 段 */
export function assertCompact(token: string): string {
  const trimmed = token.trim()
  const parts = trimmed.split('.')
  if (parts.length !== 5) {
    throw new Error(
      `不是合法的 JWE：应由 5 段组成（header.encryptedKey.iv.ciphertext.tag），当前 ${parts.length} 段`,
    )
  }
  return trimmed
}

/** 解密 JWE → 明文文本 */
export async function decryptJwe(token: string, secret: string): Promise<string> {
  const key = await importAesKey(secret)
  const result = await compactDecrypt(assertCompact(token), key)
  return new TextDecoder('utf-8', { fatal: true }).decode(result.plaintext)
}

export async function transform(input: JweParseInput, _options: JweParseOptions): Promise<string> {
  if (input.text.trim() === '') return ''
  return decryptJwe(input.text, input.secret)
}
