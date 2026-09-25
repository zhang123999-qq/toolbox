import type { JwtDecodeInput, JwtDecodeOptions } from './schema'

/** base64url → UTF-8 字符串 */
export function decodeBase64Url(part: string): string {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  const binary = atob(normalized + '='.repeat(padding))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

/** 一段 JWT → 对象（header / payload 必须是合法 JSON） */
function decodeSegment(part: string, label: string): unknown {
  let json: string
  try {
    json = decodeBase64Url(part)
  } catch {
    throw new Error(`${label} 不是合法的 base64url`)
  }
  try {
    return JSON.parse(json)
  } catch {
    throw new Error(`${label} 不是合法的 JSON：${json.slice(0, 120)}`)
  }
}

export interface DecodedJwt {
  readonly header: unknown
  readonly payload: unknown
  readonly signature: string
}

/** 解析 JWT；只做结构解析，**不验签** */
export function decodeJwt(token: string): DecodedJwt {
  const trimmed = token.trim()
  const parts = trimmed.split('.')
  if (parts.length === 5) {
    throw new Error('这是 JWE（加密令牌，5 段）：明文需先解密，请用「JWE 解析」工具')
  }
  if (parts.length !== 3) {
    throw new Error(
      `不是合法的 JWT：应由 3 段组成（header.payload.signature），当前 ${parts.length} 段`,
    )
  }
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string]
  if (headerPart === '' || payloadPart === '') {
    throw new Error('不是合法的 JWT：header 或 payload 为空')
  }
  return {
    header: decodeSegment(headerPart, 'Header'),
    payload: decodeSegment(payloadPart, 'Payload'),
    signature: signaturePart ?? '',
  }
}

/** 秒级时间戳 → ISO 字符串 */
function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString()
}

/**
 * 时间声明说明：iat / nbf / exp 转成人能读的时间，并给出是否已过期 / 未生效。
 * `now` 可注入，保证单测可断言（默认是 Date.now()）。
 */
export function describeClaims(payload: unknown, now = Date.now()): string[] {
  if (typeof payload !== 'object' || payload === null) return []
  const claims = payload as Record<string, unknown>
  const lines: string[] = []
  const nowSeconds = Math.floor(now / 1000)

  const stringify = (key: string, label: string): void => {
    const value = claims[key]
    if (typeof value !== 'number') return
    lines.push(`${label}（${key}）：${toIso(value)}`)
  }
  stringify('iat', '签发时间')
  stringify('nbf', '生效时间')
  stringify('exp', '过期时间')

  const exp = claims['exp']
  if (typeof exp === 'number') {
    const remain = exp - nowSeconds
    lines.push(
      remain > 0 ? `状态：未过期，还剩 ${remain} 秒` : `状态：已过期（超过 ${-remain} 秒）`,
    )
  }
  const nbf = claims['nbf']
  if (typeof nbf === 'number' && nbf > nowSeconds) {
    lines.push(`状态：尚未生效（还需 ${nbf - nowSeconds} 秒）`)
  }
  return lines
}

/** 拼出输出文本 */
export function formatDecoded(decoded: DecodedJwt, options: JwtDecodeOptions, now?: number): string {
  const indent = options.format === 'compact' ? 0 : 2
  const body = {
    header: decoded.header,
    payload: decoded.payload,
    signature: decoded.signature === '' ? '(无签名，alg=none)' : decoded.signature,
  }
  const claims = describeClaims(decoded.payload, now)
  const head = JSON.stringify(body, null, indent)
  return claims.length === 0 ? head : `${head}\n\n${claims.join('\n')}`
}

export function transform(input: JwtDecodeInput, options: JwtDecodeOptions): string {
  if (input.text.trim() === '') return ''
  return formatDecoded(decodeJwt(input.text), options)
}
