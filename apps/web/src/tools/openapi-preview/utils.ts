import type { OpenapiPreviewInput, OpenapiPreviewOptions } from './schema'

const MAX_INPUT = 200_000

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

interface Parameter {
  name?: string
  in?: string
  required?: boolean
  description?: string
}

/** 把 OpenAPI 文档渲染成可读大纲 */
export function renderOpenApi(doc: unknown): string {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw new Error('OpenAPI 文档必须是 JSON 对象')
  }
  const root = doc as Record<string, Record<string, unknown>>
  const paths = root['paths']
  if (typeof paths !== 'object' || paths === null || Array.isArray(paths)) {
    throw new Error('缺少 paths 字段：这看起来不是合法的 OpenAPI 文档')
  }

  const info = (root['info'] ?? {}) as Record<string, unknown>
  const lines: string[] = []
  lines.push(`标题：${String(info['title'] ?? '(未命名)')}`)
  lines.push(`版本：${String(info['version'] ?? '(未知)')}`)
  if (typeof root['openapi'] === 'string') lines.push(`OpenAPI：${String(root['openapi'])}`)
  else if (typeof root['swagger'] === 'string') lines.push(`Swagger：${String(root['swagger'])}`)
  lines.push('')

  const pathEntries = Object.entries(paths) as Array<[string, Record<string, unknown>]>
  lines.push(`共 ${pathEntries.length} 条路径：`)

  for (const [path, item] of pathEntries) {
    for (const method of HTTP_METHODS) {
      const op = item?.[method] as Record<string, unknown> | undefined
      if (!op || typeof op !== 'object') continue
      lines.push('')
      lines.push(`${method.toUpperCase()} ${path}`)
      if (typeof op['summary'] === 'string') lines.push(`  摘要：${String(op['summary'])}`)
      if (typeof op['operationId'] === 'string')
        lines.push(`  operationId：${String(op['operationId'])}`)

      const params = (op['parameters'] as Parameter[] | undefined) ?? []
      if (params.length > 0) {
        lines.push('  参数：')
        for (const p of params) {
          lines.push(
            `    - ${String(p.name ?? '?')}（in=${String(p.in ?? '?')}${p.required ? ', 必填' : ''}）`,
          )
        }
      }

      const requestBody = op['requestBody'] as
        { content?: Record<string, { schema?: unknown }>; required?: boolean } | undefined
      if (requestBody?.content) {
        lines.push('  请求体：')
        for (const mime of Object.keys(requestBody.content)) {
          lines.push(`    - ${mime}`)
        }
      }

      const responses = (op['responses'] ?? {}) as Record<string, unknown>
      const codes = Object.keys(responses)
      if (codes.length > 0) {
        lines.push(`  响应：${codes.join(', ')}`)
      }
    }
  }

  return lines.join('\n')
}

export function transform(input: OpenapiPreviewInput, _options: OpenapiPreviewOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  let doc: unknown
  try {
    doc = JSON.parse(input.text)
  } catch (error) {
    throw new Error(
      '不是合法的 JSON：' + (error instanceof Error ? error.message : String(error)),
      { cause: error },
    )
  }
  return renderOpenApi(doc)
}
