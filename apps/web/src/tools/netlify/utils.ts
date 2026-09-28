/**
 * netlify（#815）核心逻辑：netlify.toml 的手写生成与简单解析（round-trip）。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。不引入 TOML 第三方依赖。
 */

export interface NetlifyRedirect {
  from: string
  to: string
  status: number
  force?: boolean
}

export interface NetlifyHeaderRule {
  for: string
  values: Record<string, string>
}

export interface NetlifyBuild {
  command?: string
  publish?: string
  functions?: string
}

export interface NetlifyConfig {
  build?: NetlifyBuild
  redirects: NetlifyRedirect[]
  headers: NetlifyHeaderRule[]
}

const VALID_REDIRECT_STATUS = [200, 301, 302, 303, 304, 307, 308, 404, 410] as const

function tomlString(value: string): string {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
}

function requireLeadingSlash(value: string, field: string): void {
  if (!value.startsWith('/')) throw new Error(`${field} 必须以 / 开头：${value}`)
}

/** 校验并生成 netlify.toml 文本；参数非法时中文抛错 */
export function buildNetlifyToml(config: NetlifyConfig): string {
  config.redirects.forEach((r, i) => {
    requireLeadingSlash(r.from, `redirects[${i}].from`)
    requireLeadingSlash(r.to, `redirects[${i}].to`)
    if (!(VALID_REDIRECT_STATUS as readonly number[]).includes(r.status))
      throw new Error(`redirects[${i}].status 非法：${r.status}`)
  })
  config.headers.forEach((h, i) => {
    requireLeadingSlash(h.for, `headers[${i}].for`)
  })
  const lines: string[] = []
  if (config.build !== undefined) {
    lines.push('[build]')
    if (config.build.command !== undefined)
      lines.push(`  command = ${tomlString(config.build.command)}`)
    if (config.build.publish !== undefined)
      lines.push(`  publish = ${tomlString(config.build.publish)}`)
    if (config.build.functions !== undefined)
      lines.push(`  functions = ${tomlString(config.build.functions)}`)
    lines.push('')
  }
  for (const r of config.redirects) {
    lines.push('[[redirects]]')
    lines.push(`  from = ${tomlString(r.from)}`)
    lines.push(`  to = ${tomlString(r.to)}`)
    lines.push(`  status = ${r.status}`)
    if (r.force !== undefined) lines.push(`  force = ${r.force ? 'true' : 'false'}`)
    lines.push('')
  }
  for (const h of config.headers) {
    lines.push('[[headers]]')
    lines.push(`  for = ${tomlString(h.for)}`)
    lines.push('  [headers.values]')
    for (const key of Object.keys(h.values)) {
      lines.push(`    ${key} = ${tomlString(h.values[key])}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}

type TomlScalar = string | number | boolean

function parseTomlValue(raw: string, lineNo: number): TomlScalar {
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    let out = ''
    const inner = raw.slice(1, -1)
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i]
      if (ch === '\\' && i + 1 < inner.length) {
        const next = inner[i + 1]
        if (next === 'n') out += '\n'
        else if (next === '"') out += '"'
        else if (next === '\\') out += '\\'
        else throw new Error(`第 ${lineNo} 行：未知转义 \\${next}`)
        i++
      } else {
        out += ch
      }
    }
    return out
  }
  if (/^-?\d+$/.test(raw)) return Number(raw)
  if (raw === 'true') return true
  if (raw === 'false') return false
  throw new Error(`第 ${lineNo} 行：值格式非法：${raw}`)
}

function asRedirectString(value: TomlScalar, lineNo: number, key: string): string {
  if (typeof value !== 'string') throw new Error(`第 ${lineNo} 行：${key} 须为字符串`)
  return value
}

/**
 * 解析 netlify.toml 文本（支持本工具生成的子集）；
 * 格式非法时中文抛错（带行号）。
 */
export function parseNetlifyToml(text: string): NetlifyConfig {
  const config: NetlifyConfig = { redirects: [], headers: [] }
  let section: 'none' | 'build' | 'redirect' | 'header' | 'headerValues' = 'none'
  let currentRedirect: NetlifyRedirect | undefined
  let currentHeader: NetlifyHeaderRule | undefined
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue
    if (line === '[build]') {
      section = 'build'
      config.build = {}
      continue
    }
    if (line === '[[redirects]]') {
      currentRedirect = { from: '', to: '', status: 301 }
      config.redirects.push(currentRedirect)
      section = 'redirect'
      continue
    }
    if (line === '[[headers]]') {
      currentHeader = { for: '', values: {} }
      config.headers.push(currentHeader)
      section = 'header'
      continue
    }
    if (line === '[headers.values]') {
      if (section !== 'header' || currentHeader === undefined)
        throw new Error(`第 ${lineNo} 行：[headers.values] 必须紧跟在 [[headers]] 之后`)
      section = 'headerValues'
      continue
    }
    if (line.startsWith('[')) throw new Error(`第 ${lineNo} 行：不支持的节：${line}`)
    const eq = line.indexOf('=')
    if (eq <= 0) throw new Error(`第 ${lineNo} 行格式非法，应为 key = value`)
    const key = line.slice(0, eq).trim()
    const value = parseTomlValue(line.slice(eq + 1).trim(), lineNo)
    if (section === 'build' && config.build !== undefined) {
      if (key === 'command' || key === 'publish' || key === 'functions') {
        config.build[key] = asRedirectString(value, lineNo, key)
      } else {
        throw new Error(`第 ${lineNo} 行：[build] 不支持的键：${key}`)
      }
    } else if (section === 'redirect' && currentRedirect !== undefined) {
      if (key === 'from' || key === 'to') {
        currentRedirect[key] = asRedirectString(value, lineNo, key)
      } else if (key === 'status') {
        if (typeof value !== 'number') throw new Error(`第 ${lineNo} 行：status 须为数字`)
        currentRedirect.status = value
      } else if (key === 'force') {
        if (typeof value !== 'boolean') throw new Error(`第 ${lineNo} 行：force 须为布尔值`)
        currentRedirect.force = value
      } else {
        throw new Error(`第 ${lineNo} 行：[[redirects]] 不支持的键：${key}`)
      }
    } else if (section === 'header' && currentHeader !== undefined) {
      if (key === 'for') {
        currentHeader.for = asRedirectString(value, lineNo, key)
      } else {
        throw new Error(`第 ${lineNo} 行：[[headers]] 不支持的键：${key}`)
      }
    } else if (section === 'headerValues' && currentHeader !== undefined) {
      if (typeof value !== 'string') throw new Error(`第 ${lineNo} 行：响应头值须为字符串`)
      currentHeader.values[key] = value
    } else {
      throw new Error(`第 ${lineNo} 行：键值对出现在节之外`)
    }
  }
  return config
}

/** 配置摘要 */
export function summarizeNetlify(config: NetlifyConfig): string {
  const build = config.build !== undefined ? '含 [build]，' : ''
  return `${build}redirects ${config.redirects.length} 条，headers ${config.headers.length} 条`
}

export const EXAMPLE_NETLIFY_TOML = `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/old"
  to = "/new"
  status = 301
  force = true

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
`
