import type { EnvOptions } from './schema'

export interface EnvEntry {
  readonly key: string
  readonly value: string
}

export interface EnvParseResult {
  readonly entries: readonly EnvEntry[]
  readonly comments: readonly string[]
}

/** 去掉首尾成对引号 */
function unquote(value: string): string {
  const v = value.trim()
  if (v.length >= 2) {
    const first = v[0] as string
    const last = v[v.length - 1] as string
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return v.slice(1, -1)
    }
  }
  return v
}

export function parseEnv(text: string): EnvParseResult {
  const entries: EnvEntry[] = []
  const comments: string[] = []
  const lines = text.split(/\r?\n/)

  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (line === '') return
    if (line.startsWith('#')) {
      comments.push(line.replace(/^#\s*/, ''))
      return
    }
    let body = line
    if (body.startsWith('export ')) body = body.slice('export '.length).trim()
    const eq = body.indexOf('=')
    if (eq === -1) {
      throw new Error(`第 ${i + 1} 行不是合法的 KEY=VALUE 格式：${raw}`)
    }
    const key = body.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`第 ${i + 1} 行变量名不合法：${key}`)
    }
    entries.push({ key, value: unquote(body.slice(eq + 1)) })
  })

  return { entries, comments }
}

export function transform(input: { text: string }, options: EnvOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const { entries, comments } = parseEnv(input.text)
  if (entries.length === 0) throw new Error('没有解析到任何 KEY=VALUE')

  const out: string[] = [`共 ${entries.length} 个变量`, '', '变量名 | 值', '--- | ---']
  for (const e of entries) out.push(`${e.key} | ${e.value}`)
  if (options.keepComments && comments.length) {
    out.push('', `# 注释（${comments.length} 条）`)
    for (const c of comments) out.push('# ' + c)
  }
  return out.join('\n')
}
