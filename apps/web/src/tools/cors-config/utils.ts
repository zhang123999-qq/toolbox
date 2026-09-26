import type { CorsConfigInput, CorsConfigOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

const MAX_INPUT = 200_000

/** 把逗号/空白分隔的列表压成去空项数组 */
export function splitList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item !== '')
}

/** 校验一个 token：禁止换行/控制字符/引号/分号/花括号（防止注入或破坏配置语法） */
function safeToken(item: string, field: string): void {
  if (hasControlChar(item) || /["';{}]/.test(item)) {
    throw new Error(`${field}包含非法字符（换行、引号或 ; { }）：${item}`)
  }
}

/** 校验 Origin 必须是 http(s):// 开头的单条来源或 * */
function validateOrigin(item: string): void {
  safeToken(item, '来源（Origin）')
  if (item !== '*' && !/^https?:\/\/[^\s/].*$/.test(item)) {
    throw new Error(`来源（Origin）需以 http:// 或 https:// 开头：${item}`)
  }
}

/** 校验选项；非法配置直接报错 */
export function assertOptions(options: CorsConfigOptions): void {
  if (!(['allow-all', 'specific', 'same-origin'] as const).includes(options.originMode)) {
    throw new Error('不支持的来源模式：' + options.originMode)
  }
  const origins = splitList(options.originList)
  if (options.originMode === 'specific' && origins.length === 0) {
    throw new Error(
      '来源模式选了「指定来源」，请在来源列表里至少填一个 Origin（如 https://example.com）',
    )
  }
  for (const o of origins) validateOrigin(o)
  for (const m of splitList(options.methods)) {
    safeToken(m, '请求方法')
    if (!/^[A-Za-z]+$/.test(m)) throw new Error(`请求方法只能是字母：${m}`)
  }
  for (const h of splitList(options.headers)) {
    safeToken(h, '请求头')
    if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(h)) throw new Error(`请求头名不合法：${h}`)
  }
  if (options.originMode === 'allow-all' && options.credentials) {
    throw new Error(
      '不能同时使用「允许全部来源（*）」与「携带凭据」：浏览器规定带凭据时 ACAO 不能为 *，请改为指定来源',
    )
  }
  const maxAge = options.maxAge.trim()
  if (maxAge !== '' && !/^\d+$/.test(maxAge)) {
    throw new Error('预检缓存时间（max-age）必须是秒数整数')
  }
}

/** 计算 Allow-Origin 的取值 */
export function originValue(options: CorsConfigOptions): string | null {
  if (options.originMode === 'same-origin') return null
  if (options.originMode === 'allow-all') return '*'
  // 指定来源：静态配置里列出全部允许的 Origin（运行时通常回显请求的 Origin）
  return splitList(options.originList).join(', ')
}

/** 计算 Allow-Methods */
export function methodsValue(options: CorsConfigOptions): string {
  const list = splitList(options.methods)
  return (list.length > 0 ? list : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).join(', ')
}

/** 计算 Allow-Headers */
export function headersValue(options: CorsConfigOptions): string {
  const list = splitList(options.headers)
  return (list.length > 0 ? list : ['Content-Type', 'Authorization']).join(', ')
}

/** 拼出响应头文本 */
export function buildHeaders(options: CorsConfigOptions): string[] {
  const lines: string[] = []
  const origin = originValue(options)
  if (origin !== null) lines.push(`Access-Control-Allow-Origin: ${origin}`)
  lines.push(`Access-Control-Allow-Methods: ${methodsValue(options)}`)
  lines.push(`Access-Control-Allow-Headers: ${headersValue(options)}`)
  if (options.credentials) lines.push('Access-Control-Allow-Credentials: true')
  if (options.maxAge.trim() !== '') lines.push(`Access-Control-Max-Age: ${options.maxAge.trim()}`)
  return lines
}

/** Nginx 片段 */
export function buildNginx(options: CorsConfigOptions): string {
  const origin = originValue(options)
  const lines: string[] = ['location /api/ {']
  if (origin === '*') lines.push('    add_header Access-Control-Allow-Origin *;')
  else if (origin !== null) lines.push(`    add_header Access-Control-Allow-Origin "${origin}";`)
  lines.push(`    add_header Access-Control-Allow-Methods "${methodsValue(options)}";`)
  lines.push(`    add_header Access-Control-Allow-Headers "${headersValue(options)}";`)
  if (options.credentials) lines.push('    add_header Access-Control-Allow-Credentials true;')
  if (options.maxAge.trim() !== '')
    lines.push(`    add_header Access-Control-Max-Age ${options.maxAge.trim()};`)
  lines.push('    if ($request_method = OPTIONS) { return 204; }')
  lines.push('}')
  return lines.join('\n')
}

/** Express 片段 */
export function buildExpress(options: CorsConfigOptions): string {
  const origin = originValue(options)
  const lines: string[] = ['app.use((req, res, next) => {']
  if (origin !== null)
    lines.push(`  res.setHeader('Access-Control-Allow-Origin', ${JSON.stringify(origin)});`)
  lines.push(
    `  res.setHeader('Access-Control-Allow-Methods', ${JSON.stringify(methodsValue(options))});`,
  )
  lines.push(
    `  res.setHeader('Access-Control-Allow-Headers', ${JSON.stringify(headersValue(options))});`,
  )
  if (options.credentials)
    lines.push("  res.setHeader('Access-Control-Allow-Credentials', 'true');")
  if (options.maxAge.trim() !== '')
    lines.push(`  res.setHeader('Access-Control-Max-Age', '${options.maxAge.trim()}');`)
  lines.push("  if (req.method === 'OPTIONS') return res.sendStatus(204);", '  next();', '});')
  return lines.join('\n')
}

export function transform(input: CorsConfigInput, options: CorsConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT)
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  assertOptions(options)
  return [
    '# 响应头',
    ...buildHeaders(options),
    '',
    '# Nginx',
    buildNginx(options),
    '',
    '# Express / Node.js',
    buildExpress(options),
  ].join('\n')
}
