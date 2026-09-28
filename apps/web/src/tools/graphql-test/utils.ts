/**
 * graphql-test（#752）纯函数：查询校验、内省查询常量、请求发送（fetch 可注入）、结果格式化。
 * D 级工具：浏览器内发起真实请求，受目标 CORS 策略限制。
 */

/** 提取错误信息（保留非 Error 兜底） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export type FetchImpl = typeof fetch

export interface GraphqlRequest {
  endpoint: string
  query: string
  variables: string
  headers: Record<string, string>
}

export interface GraphqlResponse {
  ok: boolean
  status: number
  durationMs: number
  data?: unknown
  errors?: unknown[]
  /** 网络 / CORS / 响应解析错误的中文说明 */
  error?: string
}

/** 标准内省查询（graphql-js 内省查询的常用子集） */
export const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      ...FullType
    }
    directives {
      name
      locations
      args { ...InputValue }
    }
  }
}

fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args { ...InputValue }
    type { ...TypeRef }
  }
  inputFields { ...InputValue }
  interfaces { ...TypeRef }
  enumValues(includeDeprecated: true) { name description }
  possibleTypes { ...TypeRef }
}

fragment InputValue on __InputValue {
  name
  description
  type { ...TypeRef }
  defaultValue
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
    }
  }
}`

export const DEFAULT_QUERY = `{
  __typename
}`

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 校验端点 URL */
export function assertEndpoint(url: string): void {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入 GraphQL 端点 URL，如 https://api.example.com/graphql')
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('端点 URL 必须以 http:// 或 https:// 开头')
}

/** 把多行 `Key: Value` 解析成对象 */
export function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    if (key !== '') out[key] = trimmed.slice(idx + 1).trim()
  }
  return out
}

/** 去掉字符串字面量（"""块 / "..."）、转义与 # 注释，供括号校验用 */
export function stripGqlStrings(s: string): string {
  let out = ''
  let i = 0
  while (i < s.length) {
    if (s.startsWith('"""', i)) {
      const end = s.indexOf('"""', i + 3)
      i = end === -1 ? s.length : end + 3
    } else if (s[i] === '"') {
      i++
      while (i < s.length && s[i] !== '"') {
        if (s[i] === '\\') i++
        i++
      }
      i++
    } else if (s[i] === '#') {
      while (i < s.length && s[i] !== '\n') i++
    } else {
      out += s[i]
      i++
    }
  }
  return out
}

const BRACE_PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']' }

/**
 * 简易查询校验：关键字与括号配平（够用级别）。
 * 非法时抛中文错。
 */
export function validateGraphqlQuery(query: string): void {
  const trimmed = query.trim()
  if (trimmed === '') throw new Error('请输入 GraphQL 查询语句')
  const cleaned = stripGqlStrings(trimmed)
  if (!/\b(query|mutation|subscription|fragment)\b/.test(cleaned) && !cleaned.startsWith('{')) {
    throw new Error('查询语句非法：缺少 query/mutation/subscription 关键字或匿名查询块')
  }
  const stack: string[] = []
  for (const c of cleaned) {
    if (c === '{' || c === '(' || c === '[') {
      stack.push(c)
    } else if (c === '}' || c === ')' || c === ']') {
      const open = stack.pop()
      if (open === undefined || BRACE_PAIRS[open] !== c) {
        throw new Error('查询语句括号不匹配')
      }
    }
  }
  if (stack.length > 0) throw new Error('查询语句括号不匹配：有未闭合的括号')
}

/** 解析变量 JSON：空串视为 {}；非法时抛中文错 */
export function parseVariables(raw: string): Record<string, unknown> {
  if (raw.trim() === '') return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error('变量不是合法 JSON：' + errorMessage(e), { cause: e })
  }
  if (!isRecord(parsed)) throw new Error('变量必须是 JSON 对象')
  return parsed
}

/**
 * 发送 GraphQL 请求（POST {query, variables}）。
 * fetchImpl 可注入（测试用 mock）；默认用全局 fetch。
 * 网络/CORS 错误返回带中文 error 的响应，不抛错。
 */
export async function sendGraphql(
  req: GraphqlRequest,
  fetchImpl: FetchImpl = globalThis.fetch,
): Promise<GraphqlResponse> {
  assertEndpoint(req.endpoint)
  validateGraphqlQuery(req.query)
  const variables = parseVariables(req.variables)
  const started = Date.now()
  let res: Response
  try {
    res = await fetchImpl(req.endpoint.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...req.headers },
      body: JSON.stringify({ query: req.query, variables }),
    })
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - started,
      error: '请求失败：' + errorMessage(error) + '（常见原因：目标未允许 CORS、地址不通）',
    }
  }
  const text = await res.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      ok: false,
      status: res.status,
      durationMs: Date.now() - started,
      error: '响应不是合法 JSON：' + text.slice(0, 200),
    }
  }
  if (!isRecord(parsed)) {
    return {
      ok: false,
      status: res.status,
      durationMs: Date.now() - started,
      error: '响应不是合法的 GraphQL 结果对象',
    }
  }
  const errors = Array.isArray(parsed.errors) ? (parsed.errors as unknown[]) : undefined
  return {
    ok: res.ok && errors === undefined,
    status: res.status,
    durationMs: Date.now() - started,
    ...(parsed.data === undefined ? {} : { data: parsed.data }),
    ...(errors === undefined ? {} : { errors }),
  }
}

/** 把 GraphQL 响应格式化为文本 */
export function formatGraphqlResult(r: GraphqlResponse): string {
  if (r.error !== undefined) return r.error
  const lines = [`${r.ok ? '成功' : '失败'}：HTTP ${r.status}，耗时 ${r.durationMs}ms`]
  if (r.errors !== undefined) {
    lines.push('errors:')
    lines.push(JSON.stringify(r.errors, null, 2))
  }
  lines.push('data:')
  lines.push(r.data === undefined ? '(无)' : JSON.stringify(r.data, null, 2))
  return lines.join('\n')
}
