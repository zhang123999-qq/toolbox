/**
 * edge-auth（#818）工具函数：Worker 鉴权代码生成与 Authorization 头解析。
 * 纯函数，无 DOM / 网络依赖。
 */

export interface BasicAuthOptions {
  readonly realm: string
  readonly username?: string
  readonly password?: string
}

export interface JwtOptions {
  readonly jwksUrl?: string
  readonly issuer?: string
  readonly audience?: string
}

export const EXAMPLE_BASIC_HEADER = 'Basic dXNlcjpwYXNzd29yZA=='

/** 生成 Basic Auth Worker 代码；realm 为空即抛中文错误 */
export function generateBasicAuthWorker(options: BasicAuthOptions): string {
  const realm = options.realm.trim()
  if (realm === '') throw new Error('realm 不能为空')
  const user = (options.username ?? '').trim()
  const pass = (options.password ?? '').trim()
  const credentialCheck =
    user !== '' && pass !== ''
      ? `  const expected = 'Basic ' + btoa('${escapeJs(user)}:${escapeJs(pass)}')\n  if (auth !== expected) return unauthorized()`
      : `  // 未预置账号：仅校验请求携带了 Authorization 头，实际比对请接 KV / 环境变量\n  if (!auth) return unauthorized()`
  return `// Cloudflare Worker · HTTP Basic Auth
export default {
  async fetch(request) {
    const auth = request.headers.get('Authorization')
${credentialCheck}
    return fetch(request)
  },
}

function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="${escapeJs(realm)}", charset="UTF-8"' },
  })
}
`
}

/** 转义单引号与反斜杠，用于嵌入生成的 JS 字符串字面量 */
export function escapeJs(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
}

/** 生成 JWT 校验代码片段（WebCrypto + JWKS）；jwksUrl 若提供须为 https */
export function generateJwtVerifySnippet(options: JwtOptions): string {
  const jwksUrl = (options.jwksUrl ?? '').trim()
  if (jwksUrl !== '') {
    try {
      const url = new URL(jwksUrl)
      if (url.protocol !== 'https:') throw new Error('JWKS 地址须为 https URL')
    } catch (err) {
      if (err instanceof Error && err.message === 'JWKS 地址须为 https URL') throw err
      throw new Error('JWKS 地址格式非法', { cause: err })
    }
  }
  const issuer = (options.issuer ?? '').trim()
  const audience = (options.audience ?? '').trim()
  const claimChecks = [
    issuer !== ''
      ? `  if (payload.iss !== '${escapeJs(issuer)}') throw new Error('iss 不匹配')`
      : '',
    audience !== ''
      ? `  if (payload.aud !== '${escapeJs(audience)}') throw new Error('aud 不匹配')`
      : '',
  ]
    .filter((line) => line !== '')
    .join('\n')
  return `// Cloudflare Worker · JWT 校验片段（WebCrypto，需补全 fetchJwks 实现）
async function verifyJwt(token, jwks) {
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) throw new Error('JWT 格式非法')
  const payload = JSON.parse(atob(p.replaceAll('-', '+').replaceAll('_', '/')))
${claimChecks === '' ? '  // 可在此追加 iss / aud 断言' : claimChecks}
  if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('token 已过期')
  // TODO: 用 jwks 中的公钥经 crypto.subtle.verify 校验签名（alg 以 header 为准）
  return payload
}
// JWKS 地址：${jwksUrl === '' ? '（未填写，部署时配置）' : jwksUrl}
`
}

/** 解析 Authorization: Basic 头，返回用户名与密码；非法即抛中文错误 */
export function parseBasicAuthHeader(header: string): { username: string; password: string } {
  const value = header.trim()
  if (!value.toLowerCase().startsWith('basic '))
    throw new Error('须为 Basic 类型的 Authorization 头')
  const encoded = value.slice(6).trim()
  let decoded: string
  try {
    decoded = atob(encoded)
  } catch {
    throw new Error('Base64 解码失败')
  }
  const colonIndex = decoded.indexOf(':')
  if (colonIndex < 0) throw new Error('凭据格式非法，缺少冒号分隔符')
  return {
    username: decoded.slice(0, colonIndex),
    password: decoded.slice(colonIndex + 1),
  }
}
