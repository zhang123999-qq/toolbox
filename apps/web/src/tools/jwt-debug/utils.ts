import { decodeJwt, decodeProtectedHeader, importSPKI, jwtVerify } from 'jose'
import type { JwtDebugInput, JwtDebugOptions } from './schema'

const MAX_INPUT = 200_000

const HASH_BY_ALG: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

/** 秒级时间戳 → ISO */
function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString()
}

/** 结构化解析：header / payload / 时间声明说明（不验签） */
export function decodeDebug(token: string): {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  lines: string[]
} {
  const trimmed = token.trim()
  const parts = trimmed.split('.')
  if (parts.length === 5) {
    throw new Error('这是 JWE（加密令牌，5 段）：需要先解密才能读明文，本工具只支持未加密的 JWS')
  }
  if (parts.length !== 3) {
    throw new Error(`不是合法的 JWT：应由 3 段组成，当前 ${parts.length} 段`)
  }
  let header: Record<string, unknown>
  let payload: Record<string, unknown>
  try {
    header = decodeProtectedHeader(trimmed) as Record<string, unknown>
    payload = decodeJwt(trimmed) as Record<string, unknown>
  } catch (error) {
    throw new Error('解码失败：' + (error instanceof Error ? error.message : String(error)), {
      cause: error,
    })
  }

  const lines: string[] = []
  const nowSeconds = Math.floor(Date.now() / 1000)
  const timeClaim = (key: string, label: string): void => {
    const value = payload[key]
    if (typeof value !== 'number') return
    lines.push(`${label}（${key}）：${toIso(value)}`)
  }
  timeClaim('iat', '签发时间')
  timeClaim('nbf', '生效时间')
  timeClaim('exp', '过期时间')

  const exp = payload['exp']
  if (typeof exp === 'number') {
    const remain = exp - nowSeconds
    lines.push(
      remain > 0 ? `状态：未过期，还剩 ${remain} 秒` : `状态：已过期（超过 ${-remain} 秒）`,
    )
  }
  const nbf = payload['nbf']
  if (typeof nbf === 'number' && nbf > nowSeconds) {
    lines.push(`状态：尚未生效（还需 ${nbf - nowSeconds} 秒）`)
  }
  for (const key of ['iss', 'sub', 'aud']) {
    const value = payload[key]
    if (value !== undefined)
      lines.push(`${key}：${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
  }
  return { header, payload, lines }
}

/** 导入 HMAC 密钥（导出 CryptoKey，避免跨 realm 的 Uint8Array 判定问题） */
async function importHmac(secret: string, alg: string): Promise<CryptoKey> {
  const hash = HASH_BY_ALG[alg]
  if (!hash) throw new Error(`头声明 alg=${alg} 是不对称算法，请改用「公钥(PEM)」而非共享密钥`)
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 WebCrypto（需 HTTPS 或 localhost）')
  return subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash }, false, [
    'verify',
  ])
}

/** 验签：有密钥则校验，返回结果说明 */
export async function verifyToken(token: string, options: JwtDebugOptions): Promise<string> {
  const secret = options.secret.trim()
  const pem = options.publicKeyPem.trim()
  if (secret === '' && pem === '') return '未提供密钥：仅解码，未校验签名（任何人都能伪造 payload）'
  let alg: string
  try {
    alg = String(decodeProtectedHeader(token).alg)
  } catch {
    return '无法读取 alg，跳过验签'
  }
  try {
    let key: CryptoKey
    if (secret !== '') {
      key = await importHmac(secret, alg)
    } else {
      key = await importSPKI(pem, alg)
    }
    await jwtVerify(token, key)
    return `验签通过：签名有效（alg=${alg}）`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = (error as { code?: string }).code
    return `验签失败：${code ? `[${code}] ` : ''}${message}`
  }
}

export async function transform(input: JwtDebugInput, options: JwtDebugOptions): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  const { header, payload, lines } = decodeDebug(input.text)
  const verifyResult = await verifyToken(input.text.trim(), options)
  return [
    '## Header',
    JSON.stringify(header, null, 2),
    '',
    '## Payload',
    JSON.stringify(payload, null, 2),
    '',
    '## 声明解读',
    ...(lines.length > 0 ? lines : ['（无标准时间/注册声明）']),
    '',
    '## 验签',
    verifyResult,
  ].join('\n')
}
