/**
 * openapi-lint（#745）纯函数：OpenAPI 3.x 规范解析（JSON / 简易 YAML）与 lint 检查。
 * YAML 解析器为手写子集（映射 / 列表 / 标量），复杂结构请用 JSON。
 */

/** 提取错误信息（保留非 Error 兜底） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export interface LintIssue {
  severity: 'error' | 'warning' | 'info'
  path: string
  message: string
}

export interface LintResult {
  issues: LintIssue[]
  score: number
  summary: string
}

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace']
const PARAM_LOCATIONS = ['query', 'header', 'path', 'cookie']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/* ---------------- 简易 YAML 解析（子集） ---------------- */

function countIndent(line: string): number {
  return line.length - line.trimStart().length
}

/** 去掉行尾注释（引号内的 # 不算注释） */
export function stripComment(line: string): string {
  let single = false
  let dbl = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i] as string
    const escaped = i > 0 && line[i - 1] === '\\'
    if (c === "'" && !dbl && !escaped) single = !single
    else if (c === '"' && !single && !escaped) dbl = !dbl
    else if (c === '#' && !single && !dbl) return line.slice(0, i)
  }
  return line
}

function parseScalar(s: string): unknown {
  const t = s.trim()
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n')
  }
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'")
  }
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null' || t === '~') return null
  if (/^-?\d+$/.test(t)) return Number(t)
  if (/^-?\d*\.\d+$/.test(t)) return Number(t)
  return t
}

interface YamlLine {
  indent: number
  text: string
}

function parseYamlBlock(
  lines: YamlLine[],
  i: number,
  indent: number,
): { value: unknown; next: number } {
  const first = lines[i] as YamlLine
  if (first.text === '-' || first.text.startsWith('- ')) {
    return parseYamlList(lines, i, indent)
  }
  return parseYamlMap(lines, i, indent)
}

function parseYamlList(
  lines: YamlLine[],
  i: number,
  indent: number,
): { value: unknown[]; next: number } {
  const arr: unknown[] = []
  let j = i
  while (j < lines.length) {
    const line = lines[j] as YamlLine
    if (line.indent !== indent || (line.text !== '-' && !line.text.startsWith('- '))) break
    const rest = line.text === '-' ? '' : line.text.slice(2).trim()
    j++
    if (rest === '') {
      if (j >= lines.length || (lines[j] as YamlLine).indent <= indent) {
        throw new Error('YAML 列表项缺少缩进内容')
      }
      const r = parseYamlBlock(lines, j, (lines[j] as YamlLine).indent)
      arr.push(r.value)
      j = r.next
    } else if (rest.includes(':')) {
      const obj = parseInlineMapFirst(rest)
      const r = consumeIndentedMap(lines, j, indent, obj)
      arr.push(r.value)
      j = r.next
    } else {
      arr.push(parseScalar(rest))
    }
  }
  return { value: arr, next: j }
}

/** 解析 `- key: value` 行首的第一个键值对 */
function parseInlineMapFirst(rest: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  const c = rest.indexOf(':')
  const v = rest.slice(c + 1).trim()
  obj[rest.slice(0, c).trim()] = v === '' ? null : parseScalar(v)
  return obj
}

/** 消费缩进大于 indent 的后续 `key: value` 行，合并进 obj */
function consumeIndentedMap(
  lines: YamlLine[],
  j: number,
  indent: number,
  obj: Record<string, unknown>,
): { value: Record<string, unknown>; next: number } {
  let k = j
  while (k < lines.length && (lines[k] as YamlLine).indent > indent) {
    const t = (lines[k] as YamlLine).text
    const c = t.indexOf(':')
    if (c === -1) throw new Error('YAML 解析失败：缩进行缺少冒号')
    const key = t.slice(0, c).trim()
    const v = t.slice(c + 1).trim()
    k++
    if (v === '') {
      if (k < lines.length && (lines[k] as YamlLine).indent > (lines[k - 1] as YamlLine).indent) {
        const r = parseYamlBlock(lines, k, (lines[k] as YamlLine).indent)
        obj[key] = r.value
        k = r.next
      } else {
        obj[key] = null
      }
    } else {
      obj[key] = parseScalar(v)
    }
  }
  return { value: obj, next: k }
}

function parseYamlMap(
  lines: YamlLine[],
  i: number,
  indent: number,
): { value: Record<string, unknown>; next: number } {
  const obj: Record<string, unknown> = {}
  let j = i
  while (j < lines.length && (lines[j] as YamlLine).indent === indent) {
    const t = (lines[j] as YamlLine).text
    const c = t.indexOf(':')
    if (c === -1) throw new Error('YAML 解析失败：映射行缺少冒号')
    const key = t.slice(0, c).trim()
    const v = t.slice(c + 1).trim()
    j++
    if (v === '') {
      if (j < lines.length && (lines[j] as YamlLine).indent > indent) {
        const r = parseYamlBlock(lines, j, (lines[j] as YamlLine).indent)
        obj[key] = r.value
        j = r.next
      } else {
        obj[key] = null
      }
    } else {
      obj[key] = parseScalar(v)
    }
  }
  return { value: obj, next: j }
}

/** 解析 YAML 子集；失败抛中文错 */
export function parseSimpleYaml(text: string): unknown {
  const lines: YamlLine[] = []
  for (const raw of text.split('\n')) {
    const noComment = stripComment(raw)
    if (noComment.trim() === '') continue
    lines.push({ indent: countIndent(noComment), text: noComment.trim() })
  }
  if (lines.length === 0) throw new Error('YAML 内容为空')
  const { value, next } = parseYamlBlock(lines, 0, (lines[0] as YamlLine).indent)
  if (next !== lines.length) throw new Error('YAML 缩进不一致，无法解析')
  return value
}

/* ---------------- 规范解析入口 ---------------- */

/** 解析规范文本：先试 JSON，再试 YAML 子集 */
export function parseSpec(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('请粘贴 OpenAPI 规范内容')
  try {
    return JSON.parse(trimmed)
  } catch {
    // 不是 JSON，尝试 YAML
  }
  try {
    return parseSimpleYaml(trimmed)
  } catch (e) {
    throw new Error('规范不是合法的 JSON 或 YAML：' + errorMessage(e), { cause: e })
  }
}

/* ---------------- lint ---------------- */

/** 解析本地 $ref（如 #/components/schemas/User），一层；解析失败返回 undefined */
export function resolveLocalRef(spec: unknown, ref: string): unknown {
  if (!ref.startsWith('#/')) return undefined
  let cur: unknown = spec
  for (const seg of ref.slice(2).split('/')) {
    if (cur === null || typeof cur !== 'object') return undefined
    const key = seg.replace(/~1/g, '/').replace(/~0/g, '~')
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

function lintParameters(
  op: Record<string, unknown>,
  opPath: string,
  push: (s: LintIssue['severity'], p: string, m: string) => void,
): void {
  const parameters = op.parameters
  if (parameters === undefined) return
  if (!Array.isArray(parameters)) {
    push('error', opPath, 'parameters 必须是数组')
    return
  }
  parameters.forEach((pm, idx) => {
    const pmPath = `${opPath} parameters[${idx}]`
    if (!isRecord(pm)) {
      push('error', pmPath, '参数不是对象')
      return
    }
    if (typeof pm.name !== 'string' || pm.name === '') push('error', pmPath, '参数缺少 name')
    if (typeof pm.in !== 'string' || !PARAM_LOCATIONS.includes(pm.in)) {
      push('error', pmPath, `参数 in 非法：${String(pm.in)}`)
    }
    if (!pm.description) push('warning', pmPath, '参数缺少 description')
    if (pm.in === 'path' && pm.required !== true) {
      push('warning', pmPath, 'path 参数建议 required: true')
    }
  })
}

function lintRequestBody(
  spec: unknown,
  op: Record<string, unknown>,
  opPath: string,
  push: (s: LintIssue['severity'], p: string, m: string) => void,
): void {
  const rb = op.requestBody
  if (rb === undefined) return
  const resolved = isRecord(rb) && typeof rb.$ref === 'string' ? resolveLocalRef(spec, rb.$ref) : rb
  if (resolved === undefined) {
    push('warning', opPath, 'requestBody 的 $ref 无法解析')
    return
  }
  if (
    !isRecord(resolved) ||
    !isRecord(resolved.content) ||
    Object.keys(resolved.content).length === 0
  ) {
    push('warning', opPath, 'requestBody 缺少 content')
  }
}

function lintResponses(
  spec: unknown,
  op: Record<string, unknown>,
  opPath: string,
  push: (s: LintIssue['severity'], p: string, m: string) => void,
): void {
  const responses = op.responses
  if (!isRecord(responses) || Object.keys(responses).length === 0) {
    push('error', opPath, '缺少 responses')
    return
  }
  let has2xx = false
  for (const [code, resp] of Object.entries(responses)) {
    if (/^2/.test(code)) has2xx = true
    const r =
      isRecord(resp) && typeof resp.$ref === 'string' ? resolveLocalRef(spec, resp.$ref) : resp
    if (r === undefined) {
      push('warning', `${opPath} responses.${code}`, '$ref 无法解析')
      continue
    }
    if (!isRecord(r) || !r.description) {
      push('error', `${opPath} responses.${code}`, '响应缺少 description')
    }
  }
  if (!has2xx) push('warning', opPath, '缺少 2xx 成功响应')
}

function lintOperation(
  spec: unknown,
  op: unknown,
  opPath: string,
  seenOpIds: Set<string>,
  push: (s: LintIssue['severity'], p: string, m: string) => void,
): void {
  if (!isRecord(op)) {
    push('warning', opPath, 'operation 不是对象，已跳过')
    return
  }
  if (!op.summary && !op.description) push('warning', opPath, '缺少 summary/description')
  if (typeof op.operationId === 'string' && op.operationId !== '') {
    if (seenOpIds.has(op.operationId)) {
      push('error', opPath, `重复的 operationId：${op.operationId}`)
    } else {
      seenOpIds.add(op.operationId)
    }
  } else {
    push('info', opPath, '建议补充 operationId')
  }
  lintParameters(op, opPath, push)
  lintRequestBody(spec, op, opPath, push)
  lintResponses(spec, op, opPath, push)
}

/** 对解析后的规范做 lint，返回问题列表与评分 */
export function lintOpenApi(spec: unknown): LintResult {
  const issues: LintIssue[] = []
  const push = (severity: LintIssue['severity'], path: string, message: string): void => {
    issues.push({ severity, path, message })
  }
  if (!isRecord(spec)) {
    return {
      issues: [{ severity: 'error', path: '$', message: '规范顶层必须是对象' }],
      score: 0,
      summary: '发现 1 个错误，规范评分 0 分',
    }
  }
  if (typeof spec.openapi !== 'string' || !spec.openapi.startsWith('3.')) {
    push('error', 'openapi', '仅支持 OpenAPI 3.x（缺少 openapi: 3.x 字段）')
  }
  if (!isRecord(spec.info)) {
    push('error', 'info', '缺少 info 对象')
  } else {
    if (!spec.info.title) push('warning', 'info.title', '缺少 info.title')
    if (!spec.info.version) push('warning', 'info.version', '缺少 info.version')
  }
  const paths = spec.paths
  if (!isRecord(paths) || Object.keys(paths).length === 0) {
    push('error', 'paths', 'paths 为空或缺失')
  } else {
    const seenOpIds = new Set<string>()
    for (const [p, pathItem] of Object.entries(paths)) {
      const segments = p.split('/').filter((s) => s !== '')
      if (segments.some((seg) => !seg.startsWith('{') && /[A-Z_]/.test(seg))) {
        push('warning', `paths ${p}`, '路径建议使用 kebab-case（小写短横线）')
      }
      if (!isRecord(pathItem)) {
        push('warning', `paths ${p}`, '路径项不是对象，已跳过')
        continue
      }
      for (const method of HTTP_METHODS) {
        const op = (pathItem as Record<string, unknown>)[method]
        if (op === undefined) continue
        lintOperation(spec, op, `${p} ${method.toUpperCase()}`, seenOpIds, push)
      }
    }
  }
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length
  const score = Math.max(0, 100 - errors * 10 - warnings * 3)
  return {
    issues,
    score,
    summary: `发现 ${errors} 个错误、${warnings} 个警告，规范评分 ${score} 分`,
  }
}

const SEVERITY_LABEL: Record<LintIssue['severity'], string> = {
  error: '错误',
  warning: '警告',
  info: '提示',
}

/** 把 lint 结果格式化为文本报告 */
export function formatLintReport(result: LintResult): string {
  const lines = [result.summary, '']
  if (result.issues.length === 0) {
    lines.push('未发现问题，规范良好。')
    return lines.join('\n')
  }
  for (const issue of result.issues) {
    lines.push(`[${SEVERITY_LABEL[issue.severity]}] ${issue.path}：${issue.message}`)
  }
  return lines.join('\n')
}

export const DEFAULT_SPEC_JSON = `{
  "openapi": "3.0.0",
  "info": { "title": "示例 API", "version": "1.0.0" },
  "paths": {
    "/users/{id}": {
      "get": {
        "summary": "获取用户",
        "operationId": "getUser",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "description": "用户 ID" }
        ],
        "responses": {
          "200": { "description": "成功" }
        }
      }
    }
  }
}`
