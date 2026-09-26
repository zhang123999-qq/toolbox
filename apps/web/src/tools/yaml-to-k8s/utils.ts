import type { YamlToK8sOptions } from './schema'

interface Token {
  readonly indent: number
  readonly text: string
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue
    const indent = raw.length - raw.trimStart().length
    tokens.push({ indent, text: raw.trim() })
  }
  return tokens
}

function scalar(raw: string): unknown {
  let s = raw.trim()
  if (s.length >= 2) {
    const f = s[0] as string
    const l = s[s.length - 1] as string
    if ((f === '"' && l === '"') || (f === "'" && l === "'")) s = s.slice(1, -1)
  }
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null' || s === '~' || s === '') return null
  if (/^-?\d+$/.test(s)) return Number.parseInt(s, 10)
  if (/^-?\d+\.\d+$/.test(s)) return Number.parseFloat(s)
  return s
}

function parseMap(tokens: Token[], i: number, indent: number): [Record<string, unknown>, number] {
  const obj: Record<string, unknown> = {}
  while (i < tokens.length) {
    const t = tokens[i] as Token
    if (t.indent < indent) break
    if (t.indent > indent) throw new Error('YAML 缩进异常：' + t.text)
    if (t.text.startsWith('- ')) break
    const m = t.text.match(/^([^:]+):\s*(.*)$/)
    if (!m) throw new Error('YAML 行无法解析：' + t.text)
    const key = (m[1] as string).trim()
    const rest = m[2] as string
    if (rest === '') {
      const [child, ni] = parseNode(tokens, i + 1, indent + 2)
      obj[key] = child
      i = ni
    } else {
      obj[key] = scalar(rest)
      i++
    }
  }
  return [obj, i]
}

function parseSeq(tokens: Token[], i: number, indent: number): [unknown[], number] {
  const arr: unknown[] = []
  while (i < tokens.length) {
    const t = tokens[i] as Token
    if (t.indent !== indent || !t.text.startsWith('-')) break
    const after = t.text.slice(1).trim()
    const km = after.match(/^([^:]+):\s*(.*)$/)
    if (!km) {
      arr.push(scalar(after))
      i++
      continue
    }
    const item: Record<string, unknown> = {}
    const key = (km[1] as string).trim()
    const rest = km[2] as string
    if (rest === '') {
      const [child, ni] = parseNode(tokens, i + 1, indent + 2)
      item[key] = child
      i = ni
    } else {
      item[key] = scalar(rest)
      i++
    }
    // 消费该 map 项后续对齐在 indent+2 的键
    while (i < tokens.length) {
      const nt = tokens[i] as Token
      if (nt.indent <= indent || nt.text.startsWith('- ')) break
      const mm = nt.text.match(/^([^:]+):\s*(.*)$/)
      if (!mm) throw new Error('YAML 行无法解析：' + nt.text)
      const k2 = (mm[1] as string).trim()
      const r2 = mm[2] as string
      if (r2 === '') {
        const [child, ni] = parseNode(tokens, i + 1, nt.indent + 2)
        item[k2] = child
        i = ni
      } else {
        item[k2] = scalar(r2)
        i++
      }
    }
    arr.push(item)
  }
  return [arr, i]
}

function parseNode(tokens: Token[], i: number, indent: number): [unknown, number] {
  if (i >= tokens.length) return [null, i]
  const t = tokens[i] as Token
  if (t.indent < indent) return [null, i]
  if (t.text.startsWith('- ')) return parseSeq(tokens, i, indent)
  return parseMap(tokens, i, indent)
}

/** 解析 YAML 子集（key: value / 列表 / 2-3 层嵌套） */
export function parseYaml(text: string): unknown {
  const tokens = tokenize(text)
  if (tokens.length === 0) throw new Error('YAML 内容为空')
  const [node, next] = parseNode(tokens, 0, tokens[0]?.indent ?? 0)
  if (next < tokens.length)
    throw new Error('YAML 存在无法解析的行：' + (tokens[next] as Token).text)
  return node
}

// ---- 自研 YAML 序列化 ----

function emitScalar(v: unknown): string {
  if (v === null) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  const s = String(v)
  if (s === '' || /[:#&*!|>'"%@`]|\s/.test(s) || /^(true|false|null|~)$/.test(s))
    return JSON.stringify(s)
  return s
}

function emitObject(obj: Record<string, unknown>, col: number, firstPrefix?: string): string[] {
  const out: string[] = []
  Object.entries(obj).forEach(([k, v], idx) => {
    const prefix = idx === 0 && firstPrefix !== undefined ? firstPrefix : ' '.repeat(col)
    if (Array.isArray(v)) {
      if (v.length === 0) {
        out.push(`${prefix}${k}: []`)
      } else {
        out.push(`${prefix}${k}:`)
        out.push(...emitArray(v, col + 2))
      }
    } else if (v !== null && typeof v === 'object') {
      out.push(`${prefix}${k}:`)
      out.push(...emitObject(v as Record<string, unknown>, col + 2))
    } else {
      out.push(`${prefix}${k}: ${emitScalar(v)}`)
    }
  })
  return out
}

function emitArray(arr: readonly unknown[], col: number): string[] {
  const out: string[] = []
  for (const item of arr) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      out.push(...emitObject(item as Record<string, unknown>, col + 2, ' '.repeat(col) + '- '))
    } else if (Array.isArray(item)) {
      const inner = emitArray(item, col + 2)
      out.push(' '.repeat(col) + '- ' + (inner[0] as string).trimStart())
      out.push(...inner.slice(1))
    } else {
      out.push(' '.repeat(col) + '- ' + emitScalar(item))
    }
  }
  return out
}

export function toYaml(node: unknown): string {
  if (node === null) return 'null'
  if (typeof node !== 'object') return emitScalar(node)
  if (Array.isArray(node)) return emitArray(node, 0).join('\n')
  return emitObject(node as Record<string, unknown>, 0).join('\n')
}

// ---- K8s 校验 ----

export function transform(input: { text: string }, _options: YamlToK8sOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const node = parseYaml(input.text)
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error('顶层必须是 K8s 资源对象（mapping）')
  }
  const root = node as Record<string, unknown>

  const checks: string[] = []
  const apiVersion = root['apiVersion']
  checks.push(apiVersion ? `✓ apiVersion: ${String(apiVersion)}` : '✗ 缺少 apiVersion')
  const kind = root['kind']
  checks.push(kind ? `✓ kind: ${String(kind)}` : '✗ 缺少 kind')
  const meta = root['metadata']
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const name = (meta as Record<string, unknown>)['name']
    checks.push(name ? `✓ metadata.name: ${String(name)}` : '✗ 缺少 metadata.name')
  } else {
    checks.push('✗ 缺少 metadata 对象')
  }

  return ['== K8s 校验结果 ==', ...checks, '', '== 格式化 YAML ==', toYaml(root)].join('\n')
}
