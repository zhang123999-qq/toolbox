import type { GraphqlSchemaInput, GraphqlSchemaOptions } from './schema'

/** 解析非法时抛出，由 UI 捕获展示 */
export class GraphqlSchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GraphqlSchemaError'
  }
}

const MAX_INPUT = 500_000

export type DefinitionKind = 'type' | 'input' | 'interface' | 'enum' | 'union' | 'scalar' | 'schema'

export interface FieldInfo {
  readonly name: string
  readonly type: string
}

export interface Definition {
  readonly kind: DefinitionKind
  readonly name: string
  readonly extend: boolean
  readonly fields?: readonly FieldInfo[]
  readonly values?: readonly string[]
}

const OBJECT_KINDS = new Set<DefinitionKind>(['type', 'input', 'interface'])

/** 去掉 # 注释（GraphQL 没有块注释；字符串里出现 # 的情况在 SDL 头部极少，做保守处理） */
function stripComments(sdl: string): string {
  return sdl.replace(/#[^\n]*/g, '')
}

/** 由开括号位置找到配平的闭括号位置；找不到返回 -1 */
function matchBrace(text: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1
    else if (text[i] === '}') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/** 从对象类型体里取字段：name(args): Type（忽略指令与参数细节） */
function parseFields(body: string): FieldInfo[] {
  const fields: FieldInfo[] = []
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim().replace(/,$/, '').trim()
    if (line === '') continue
    // name 后可能紧跟 (参数)，再到冒号
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*:\s*(.+)$/.exec(line)
    if (!match) continue
    const type = match[2].replace(/@[A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?/g, '').trim()
    if (type !== '') fields.push({ name: match[1], type })
  }
  return fields
}

/** 解析 SDL，返回顶层定义（按出现顺序） */
export function parseSchema(sdl: string): Definition[] {
  const text = stripComments(sdl)
  const definitions: Definition[] = []
  const keyword = /\b(extend\s+)?(type|input|interface|enum|union|scalar|schema)\b/g

  let match: RegExpExecArray | null
  while ((match = keyword.exec(text)) !== null) {
    const at = match.index
    // 仅处理顶层（在所有已出现定义体之外：花括号净值为 0）
    const before = text.slice(0, at)
    const depth = (before.match(/{/g)?.length ?? 0) - (before.match(/}/g)?.length ?? 0)
    if (depth !== 0) continue

    const extend = (match[1] ?? '').trim() === 'extend'
    const kind = match[2] as DefinitionKind
    const rest = text.slice(at + match[0].length)

    if (kind === 'scalar') {
      const name = /^\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(rest)?.[1]
      if (name) definitions.push({ kind, name, extend })
      continue
    }

    if (kind === 'union') {
      // union Name = A | B（读到行尾或分号）
      const header = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^\n;]+)/.exec(rest)
      if (header) {
        const values = header[2]
          .split('|')
          .map((part) => part.replace(/@\w+(?:\([^)]*\))?/g, '').trim())
          .filter((part) => part !== '')
        definitions.push({ kind, name: header[1], extend, values })
      }
      continue
    }

    if (kind === 'schema') {
      definitions.push({ kind, name: 'schema', extend })
      keyword.lastIndex = at + match[0].length
      continue
    }

    // 对象类型 / 枚举：名字在 implements / 块之前
    const openBrace = rest.indexOf('{')
    if (openBrace === -1) {
      throw new GraphqlSchemaError(`${kind} 定义缺少 “{” 体`)
    }
    const headerText = rest.slice(0, openBrace)
    const nameMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(headerText)
    if (!nameMatch) throw new GraphqlSchemaError(`${kind} 定义缺少名字`)
    const name = nameMatch[1]

    const absoluteOpen = at + match[0].length + openBrace
    const closeIndex = matchBrace(text, absoluteOpen)
    if (closeIndex === -1) throw new GraphqlSchemaError(`${kind} ${name} 的花括号未闭合`)

    const body = text.slice(absoluteOpen + 1, closeIndex)
    if (OBJECT_KINDS.has(kind)) {
      definitions.push({ kind, name, extend, fields: parseFields(body) })
    } else {
      const values = body
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter((token) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(token))
      definitions.push({ kind, name, extend, values })
    }
    keyword.lastIndex = closeIndex + 1
  }

  return definitions
}

const KIND_LABEL: Record<DefinitionKind, string> = {
  type: '对象类型（type）',
  input: '输入类型（input）',
  interface: '接口（interface）',
  enum: '枚举（enum）',
  union: '联合（union）',
  scalar: '标量（scalar）',
  schema: 'schema',
}
const KIND_ORDER: readonly DefinitionKind[] = [
  'type',
  'input',
  'interface',
  'enum',
  'union',
  'scalar',
  'schema',
]

/**
 * SDL → 结构化清单。
 * 空输入返回空串；解析不到任何定义抛 GraphqlSchemaError。
 */
export function transform(input: GraphqlSchemaInput, _options?: GraphqlSchemaOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new GraphqlSchemaError('输入超过 500,000 字符上限')

  const definitions = parseSchema(input.text)
  if (definitions.length === 0) {
    throw new GraphqlSchemaError('没有解析到任何 GraphQL 类型定义（type / input / enum …）')
  }

  const lines: string[] = ['# GraphQL Schema 结构预览', '']
  lines.push(
    `共 ${definitions.length} 个定义：` +
      KIND_ORDER.map((kind) => {
        const count = definitions.filter((d) => d.kind === kind).length
        return count > 0 ? `${KIND_LABEL[kind].split('（')[0]} ${count}` : ''
      })
        .filter((part) => part !== '')
        .join(' · '),
  )
  lines.push('')

  for (const kind of KIND_ORDER) {
    const group = definitions.filter((d) => d.kind === kind)
    if (group.length === 0) continue
    lines.push(`## ${KIND_LABEL[kind]}`)
    for (const def of group) {
      const prefix = def.extend ? 'extend ' : ''
      if (def.fields) {
        lines.push(`- **${prefix}${def.name}**（${def.fields.length} 个字段）`)
        for (const field of def.fields) lines.push(`    - ${field.name}: ${field.type}`)
      } else if (def.values) {
        lines.push(`- **${prefix}${def.name}**：${def.values.join(' | ') || '（空）'}`)
      } else {
        lines.push(`- **${prefix}${def.name}**`)
      }
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
