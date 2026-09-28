/**
 * api-mock（#743）纯函数：mock 路由规则校验、请求行解析、路径模式匹配、模板渲染。
 * 纯前端，无网络请求。
 */

/** 提取错误信息（保留非 Error 兜底） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 单条 mock 路由规则（已归一化） */
export interface MockRoute {
  method: string
  pathPattern: string
  status: number
  headers: Record<string, string>
  bodyTemplate: string
  delayMs: number
}

/** 待匹配的模拟请求 */
export interface MockRequest {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
}

/** 匹配结果 */
export interface MatchResult {
  matched: boolean
  routeIndex: number
  params: Record<string, string>
  status: number
  headers: Record<string, string>
  body: string
  message: string
}

export const DEFAULT_REQUEST_LINE = 'GET /users/123?active=true'

export const DEFAULT_ROUTES_JSON = `[
  {
    "method": "GET",
    "pathPattern": "/users/:id",
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "bodyTemplate": "{\\"id\\": \\"{{param.id}}\\", \\"active\\": \\"{{query.active}}\\"}",
    "delayMs": 0
  },
  {
    "method": "POST",
    "pathPattern": "/users",
    "status": 201,
    "bodyTemplate": "{\\"created\\": true, \\"name\\": \\"{{body.name}}\\"}"
  }
]`

/** 解析模拟请求行，如 `GET /users/123?active=true`（缺方法时默认 GET） */
export function parseRequestLine(line: string): Omit<MockRequest, 'body'> {
  const trimmed = line.trim()
  if (trimmed === '') throw new Error('请输入模拟请求行，如 GET /users/123')
  const parts = trimmed.split(/\s+/)
  let method = 'GET'
  let target = parts[0] as string
  if (parts.length > 1 && /^[A-Za-z]+$/.test(parts[0] as string)) {
    method = (parts[0] as string).toUpperCase()
    target = parts[1] as string
  }
  if (!target.startsWith('/')) throw new Error('请求目标必须以 / 开头，如 /users/123')
  const qIndex = target.indexOf('?')
  const path = qIndex === -1 ? target : target.slice(0, qIndex)
  const query: Record<string, string> = {}
  if (qIndex !== -1) {
    const params = new URLSearchParams(target.slice(qIndex + 1))
    params.forEach((value, key) => {
      query[key] = value
    })
  }
  return { method, path, query }
}

/** 把路径模式编译为正则：`:id` 命名参数、`*` 通配，其余按字面匹配 */
export function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  const parts = pattern.split('/').map((seg) => {
    if (seg.startsWith(':')) {
      const name = seg.slice(1)
      if (name === '') throw new Error(`路径模式参数名不能为空：${pattern}`)
      paramNames.push(name)
      return '([^/]+)'
    }
    if (seg === '*') return '(.*)'
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })
  return { regex: new RegExp('^' + parts.join('/') + '$'), paramNames }
}

/** 单条路由匹配：方法一致（或 * 通配）且路径模式命中时返回命名参数 */
export function matchRoute(
  route: MockRoute,
  method: string,
  path: string,
): Record<string, string> | null {
  if (route.method !== '*' && route.method.toUpperCase() !== method.toUpperCase()) return null
  const { regex, paramNames } = compilePattern(route.pathPattern)
  const m = regex.exec(path)
  if (m === null) return null
  const params: Record<string, string> = {}
  paramNames.forEach((name, i) => {
    params[name] = decodeURIComponent(m[i + 1] as string)
  })
  return params
}

/** 按点路径取值，支持数组下标；取不到返回 undefined */
export function getByPath(obj: unknown, path: string): unknown {
  if (path === '') return undefined
  let cur: unknown = obj
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(seg)) return undefined
      cur = cur[Number(seg)]
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[seg]
    } else {
      return undefined
    }
  }
  return cur
}

export interface TemplateContext {
  query: Record<string, string>
  param: Record<string, string>
  body: unknown
}

/**
 * 渲染 bodyTemplate：支持 {{query.x}} / {{param.id}} / {{body.a.b}} 占位。
 * 作用域非法、路径为空、变量缺失时抛中文错。
 */
export function renderTemplate(tpl: string, ctx: TemplateContext): string {
  return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr: string) => {
    const trimmedExpr = expr.trim()
    const dot = trimmedExpr.indexOf('.')
    const scope = dot === -1 ? trimmedExpr : trimmedExpr.slice(0, dot)
    const keyPath = dot === -1 ? '' : trimmedExpr.slice(dot + 1)
    if (scope !== 'query' && scope !== 'param' && scope !== 'body') {
      throw new Error(`不支持的模板变量：{{${trimmedExpr}}}，仅支持 query./param./body. 前缀`)
    }
    if (keyPath === '') throw new Error(`模板变量缺少路径：{{${trimmedExpr}}}`)
    const value =
      scope === 'query'
        ? ctx.query[keyPath]
        : scope === 'param'
          ? ctx.param[keyPath]
          : getByPath(ctx.body, keyPath)
    if (value === undefined || value === null) {
      throw new Error(`模板变量缺失：${scope}.${keyPath}`)
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value)
  })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 校验路由规则 JSON，返回归一化后的路由数组；非法时抛中文错 */
export function validateRoutes(raw: string): MockRoute[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error('路由规则不是合法 JSON：' + errorMessage(e), { cause: e })
  }
  if (!Array.isArray(parsed)) throw new Error('路由规则必须是数组')
  if (parsed.length === 0) throw new Error('请至少定义一条 mock 路由')
  return parsed.map((item, i) => {
    const label = `第 ${i + 1} 条路由`
    if (!isRecord(item)) throw new Error(`${label}必须是对象`)
    if (typeof item.method !== 'string' || item.method.trim() === '') {
      throw new Error(`${label}的 method 必须是非空字符串`)
    }
    if (typeof item.pathPattern !== 'string' || !item.pathPattern.startsWith('/')) {
      throw new Error(`${label}的 pathPattern 必须是以 / 开头的字符串`)
    }
    if (
      typeof item.status !== 'number' ||
      !Number.isInteger(item.status) ||
      item.status < 100 ||
      item.status > 599
    ) {
      throw new Error(`${label}的 status 必须是 100–599 的整数`)
    }
    const headers: Record<string, string> = {}
    if (item.headers !== undefined) {
      if (!isRecord(item.headers)) throw new Error(`${label}的 headers 必须是对象`)
      for (const [k, v] of Object.entries(item.headers)) {
        if (typeof v !== 'string') throw new Error(`${label}的 headers.${k} 必须是字符串`)
        headers[k] = v
      }
    }
    if (item.bodyTemplate !== undefined && typeof item.bodyTemplate !== 'string') {
      throw new Error(`${label}的 bodyTemplate 必须是字符串`)
    }
    let delayMs = 0
    if (item.delayMs !== undefined) {
      if (typeof item.delayMs !== 'number' || item.delayMs < 0) {
        throw new Error(`${label}的 delayMs 必须是不小于 0 的数字`)
      }
      delayMs = item.delayMs
    }
    return {
      method: item.method.trim().toUpperCase(),
      pathPattern: item.pathPattern,
      status: item.status,
      headers,
      bodyTemplate: typeof item.bodyTemplate === 'string' ? item.bodyTemplate : '',
      delayMs,
    }
  })
}

/** 解析请求体输入：空串视为无 body；非法 JSON 抛中文错 */
export function parseJsonBody(raw: string): unknown {
  if (raw.trim() === '') return undefined
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error('请求体不是合法 JSON：' + errorMessage(e), { cause: e })
  }
}

/** 按顺序匹配路由，命中后渲染响应；模板错误或无匹配时返回未命中结果 */
export function matchMockRequest(routes: MockRoute[], req: MockRequest): MatchResult {
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i] as MockRoute
    const params = matchRoute(route, req.method, req.path)
    if (params === null) continue
    try {
      const body = renderTemplate(route.bodyTemplate, {
        query: req.query,
        param: params,
        body: req.body,
      })
      return {
        matched: true,
        routeIndex: i,
        params,
        status: route.status,
        headers: route.headers,
        body,
        message: `命中路由 #${i + 1}（${route.method} ${route.pathPattern}）`,
      }
    } catch (e) {
      return {
        matched: false,
        routeIndex: i,
        params,
        status: 0,
        headers: {},
        body: '',
        message: errorMessage(e),
      }
    }
  }
  return {
    matched: false,
    routeIndex: -1,
    params: {},
    status: 0,
    headers: {},
    body: '',
    message: `无匹配的 mock 路由：${req.method} ${req.path}`,
  }
}

/** 把匹配结果格式化为可复制的文本报告 */
export function formatResult(r: MatchResult): string {
  if (!r.matched) return r.message
  const lines = [r.message, `状态：${r.status}`]
  const headerKeys = Object.keys(r.headers)
  if (headerKeys.length > 0) {
    lines.push('响应头：')
    for (const k of headerKeys) lines.push(`  ${k}: ${r.headers[k]}`)
  }
  lines.push('响应体：')
  lines.push(r.body === '' ? '(空)' : r.body)
  return lines.join('\n')
}
