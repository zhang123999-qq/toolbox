/**
 * api-doc（#756）纯函数：接口定义校验、Markdown API 文档生成。
 * A 级工具：纯本地文本生成；与 openapi-preview 差异化——本工具从表单化定义生成文档。
 */

export const API_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const
export type ApiMethod = (typeof API_METHODS)[number]

export interface ApiHeader {
  name: string
  required: boolean
  description: string
}

export interface ApiQueryParam {
  name: string
  type: string
  required: boolean
  description: string
}

export interface ApiDef {
  name: string
  method: ApiMethod
  path: string
  description: string
  headers: ApiHeader[]
  queryParams: ApiQueryParam[]
  bodyExample: string
  responseExample: string
}

export interface DocOptions {
  title: string
  version: string
}

export const EMPTY_API_DEF: ApiDef = {
  name: '',
  method: 'GET',
  path: '/',
  description: '',
  headers: [],
  queryParams: [],
  bodyExample: '',
  responseExample: '',
}

/** 校验并规范化单个接口定义（缺字段补默认） */
export function normalizeApiDef(def: unknown): ApiDef {
  if (typeof def !== 'object' || def === null) throw new Error('接口定义必须是对象')
  const d = def as Record<string, unknown>
  if (typeof d.name !== 'string' || d.name.trim() === '') throw new Error('接口名称不能为空')
  const method = typeof d.method === 'string' ? d.method.toUpperCase() : ''
  if (!(API_METHODS as readonly string[]).includes(method)) {
    throw new Error(
      'method 非法：' + String(d.method) + '，应为 ' + API_METHODS.join('/') + ' 之一',
    )
  }
  if (typeof d.path !== 'string' || !d.path.startsWith('/')) throw new Error('path 必须以 / 开头')
  return {
    name: d.name.trim(),
    method: method as ApiMethod,
    path: d.path,
    description: typeof d.description === 'string' ? d.description : '',
    headers: normalizeHeaders(d.headers),
    queryParams: normalizeQueryParams(d.queryParams),
    bodyExample: typeof d.bodyExample === 'string' ? d.bodyExample : '',
    responseExample: typeof d.responseExample === 'string' ? d.responseExample : '',
  }
}

function normalizeHeaders(v: unknown): ApiHeader[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((h) => typeof h === 'object' && h !== null)
    .map((h) => {
      const o = h as Record<string, unknown>
      return {
        name: typeof o.name === 'string' ? o.name : '',
        required: o.required === true,
        description: typeof o.description === 'string' ? o.description : '',
      }
    })
    .filter((h) => h.name !== '')
}

function normalizeQueryParams(v: unknown): ApiQueryParam[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((p) => typeof p === 'object' && p !== null)
    .map((p) => {
      const o = p as Record<string, unknown>
      return {
        name: typeof o.name === 'string' ? o.name : '',
        type: typeof o.type === 'string' && o.type !== '' ? o.type : 'string',
        required: o.required === true,
        description: typeof o.description === 'string' ? o.description : '',
      }
    })
    .filter((p) => p.name !== '')
}

/** 解析接口定义 JSON（单个对象或数组） */
export function parseApiDefs(json: string): ApiDef[] {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('接口定义不是合法 JSON')
  }
  const list = Array.isArray(raw) ? raw : [raw]
  if (list.length === 0) throw new Error('至少定义一个接口')
  return list.map((d, i) => {
    try {
      return normalizeApiDef(d)
    } catch (err) {
      throw new Error('第 ' + (i + 1) + ' 个接口：' + (err as Error).message, { cause: err })
    }
  })
}

/** Markdown 表格单元格转义 */
export function escapeMdCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

/** 生成 GitHub 风格锚点 */
export function anchorOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** 生成 Markdown API 文档 */
export function generateApiDoc(defs: ApiDef[], opts: DocOptions): string {
  if (defs.length === 0) throw new Error('至少定义一个接口')
  const title = opts.title.trim() === '' ? 'API 文档' : opts.title.trim()
  const version = opts.version.trim()
  const lines: string[] = []
  lines.push('# ' + title)
  lines.push('')
  if (version !== '') {
    lines.push('版本：' + version)
    lines.push('')
  }
  lines.push('## 目录')
  lines.push('')
  defs.forEach((d, i) => {
    lines.push(
      i + 1 + '. [' + d.method + ' ' + d.path + ' - ' + d.name + '](#' + anchorOf(d.name) + ')',
    )
  })
  lines.push('')
  defs.forEach((d, i) => {
    lines.push('## ' + (i + 1) + '. ' + d.name)
    lines.push('')
    lines.push('```')
    lines.push(d.method + ' ' + d.path)
    lines.push('```')
    lines.push('')
    if (d.description !== '') {
      lines.push(d.description)
      lines.push('')
    }
    if (d.headers.length > 0) {
      lines.push('### 请求头')
      lines.push('')
      lines.push('| 名称 | 必填 | 说明 |')
      lines.push('| --- | --- | --- |')
      for (const h of d.headers) {
        lines.push(
          '| ' +
            escapeMdCell(h.name) +
            ' | ' +
            (h.required ? '是' : '否') +
            ' | ' +
            escapeMdCell(h.description) +
            ' |',
        )
      }
      lines.push('')
    }
    if (d.queryParams.length > 0) {
      lines.push('### 查询参数')
      lines.push('')
      lines.push('| 名称 | 类型 | 必填 | 说明 |')
      lines.push('| --- | --- | --- | --- |')
      for (const p of d.queryParams) {
        lines.push(
          '| ' +
            escapeMdCell(p.name) +
            ' | ' +
            escapeMdCell(p.type) +
            ' | ' +
            (p.required ? '是' : '否') +
            ' | ' +
            escapeMdCell(p.description) +
            ' |',
        )
      }
      lines.push('')
    }
    if (d.bodyExample.trim() !== '') {
      lines.push('### 请求体示例')
      lines.push('')
      lines.push('```json')
      lines.push(d.bodyExample.trim())
      lines.push('```')
      lines.push('')
    }
    if (d.responseExample.trim() !== '') {
      lines.push('### 响应示例')
      lines.push('')
      lines.push('```json')
      lines.push(d.responseExample.trim())
      lines.push('```')
      lines.push('')
    }
  })
  return lines.join('\n')
}

/** 示例定义 JSON（供页面一键填入） */
export const EXAMPLE_API_DEFS_JSON = JSON.stringify(
  [
    {
      name: '获取用户信息',
      method: 'GET',
      path: '/api/users/{id}',
      description: '根据用户 ID 查询用户基本信息。',
      headers: [{ name: 'Authorization', required: true, description: 'Bearer 令牌' }],
      queryParams: [
        { name: 'verbose', type: 'boolean', required: false, description: '是否返回详情' },
      ],
      bodyExample: '',
      responseExample: '{\n  "id": 1,\n  "name": "张三"\n}',
    },
    {
      name: '创建用户',
      method: 'POST',
      path: '/api/users',
      description: '创建新用户。',
      headers: [],
      queryParams: [],
      bodyExample: '{\n  "name": "李四",\n  "email": "lisi@example.com"\n}',
      responseExample: '{\n  "id": 2\n}',
    },
  ],
  null,
  2,
)
