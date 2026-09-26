import type { CorsCheckInput, CorsCheckOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class CorsCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CorsCheckError'
  }
}

const MAX_INPUT = 200_000

/** 响应头别名（本工具只看 HTTP 头，字段名统一小写） */
const H = {
  acao: 'access-control-allow-origin',
  acac: 'access-control-allow-credentials',
  acam: 'access-control-allow-methods',
  acah: 'access-control-allow-headers',
  aceh: 'access-control-expose-headers',
  acma: 'access-control-max-age',
  vary: 'vary',
} as const

export type Level = '通过' | '风险' | '问题' | '提示'

export interface Finding {
  readonly header: string
  readonly level: Level
  readonly detail: string
}

/** 解析原始 HTTP 响应头：跳过状态行与空行，同名头逗号合并 */
export function parseHeaders(text: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || /^HTTP\//i.test(line)) continue
    const index = line.indexOf(':')
    if (index === -1) continue
    const name = line.slice(0, index).trim().toLowerCase()
    const value = line.slice(index + 1).trim()
    if (name === '') continue
    const existing = map.get(name)
    map.set(name, existing === undefined ? value : `${existing}, ${value}`)
  }
  return map
}

const LEVEL_ORDER: Record<Level, number> = { 问题: 0, 风险: 1, 提示: 2, 通过: 3 }

/** 逐条评估 CORS 响应头 */
export function evaluate(headers: ReadonlyMap<string, string>): Finding[] {
  const findings: Finding[] = []
  const get = (key: string): string | undefined => headers.get(key)
  const acao = get(H.acao)
  const acac = get(H.acac)?.toLowerCase() === 'true'
  const vary = get(H.vary)

  // ---- Access-Control-Allow-Origin ----
  if (acao === undefined) {
    findings.push({
      header: 'Access-Control-Allow-Origin',
      level: '提示',
      detail: '未返回该头：资源默认不能被跨源脚本读取（同源策略生效）。若无需跨域，这是正常的。',
    })
  } else if (acao.trim() === '*') {
    if (acac) {
      findings.push({
        header: 'Access-Control-Allow-Origin',
        level: '问题',
        detail:
          '通配符 * 与 Access-Control-Allow-Credentials: true 同时出现，浏览器会直接拒绝该响应（带凭据时不允许 *），配置无效。',
      })
    } else {
      findings.push({
        header: 'Access-Control-Allow-Origin',
        level: '风险',
        detail:
          '允许任意来源（*）跨源访问，且无法携带 Cookie 等凭据。确认资源是否真的需要对全网开放。',
      })
    }
  } else if (acao.trim().toLowerCase() === 'null') {
    findings.push({
      header: 'Access-Control-Allow-Origin',
      level: '风险',
      detail: '回显 "null" 源，沙箱化文件 / 本地页面可被放行，容易被误用，建议改为显式白名单。',
    })
  } else {
    findings.push({
      header: 'Access-Control-Allow-Origin',
      level: '通过',
      detail: `仅放行来源：${acao.trim()}。${acac ? '与凭据配合正确。' : ''}`,
    })
    if (!vary || !/\bOrigin\b/i.test(vary)) {
      findings.push({
        header: 'Vary',
        level: '提示',
        detail:
          '按来源回显 ACAO 时建议同时返回 Vary: Origin，避免 CDN/缓存把某个来源的响应错发给其他来源。',
      })
    }
  }

  // ---- Access-Control-Allow-Credentials ----
  if (get(H.acac) !== undefined) {
    findings.push({
      header: 'Access-Control-Allow-Credentials',
      level: acac && acao !== undefined && acao.trim() !== '*' ? '通过' : '提示',
      detail: acac
        ? '允许跨源请求携带凭据（Cookie / 授权头）。'
        : '当前值不为 true：跨源请求不携带凭据。',
    })
  }

  // ---- Access-Control-Allow-Methods ----
  if (acao !== undefined) {
    const methods = get(H.acam)
    if (methods === undefined) {
      findings.push({
        header: 'Access-Control-Allow-Methods',
        level: '提示',
        detail: '预检响应未声明允许的方法；非简单请求（PUT/DELETE/自定义头）的预检会失败。',
      })
    } else {
      findings.push({
        header: 'Access-Control-Allow-Methods',
        level: '通过',
        detail: `允许方法：${methods.trim()}`,
      })
    }
  }

  // ---- Access-Control-Allow-Headers ----
  const acah = get(H.acah)
  if (acao !== undefined) {
    if (acah === undefined) {
      findings.push({
        header: 'Access-Control-Allow-Headers',
        level: '提示',
        detail:
          '预检响应未声明允许的请求头；带自定义头（Authorization、Content-Type: application/json 等）的请求会被拦截。',
      })
    } else if (acah.trim() === '*') {
      findings.push({
        header: 'Access-Control-Allow-Headers',
        level: acac ? '风险' : '通过',
        detail:
          (acac
            ? '通配符 * 在带凭据请求中不会匹配 Authorization，需要显式列出。'
            : '允许任意请求头。') + ` 当前：${acah.trim()}`,
      })
    } else {
      findings.push({
        header: 'Access-Control-Allow-Headers',
        level: '通过',
        detail: `允许请求头：${acah.trim()}`,
      })
    }
  }

  // ---- Access-Control-Expose-Headers ----
  if (get(H.aceh) === undefined && acao !== undefined) {
    findings.push({
      header: 'Access-Control-Expose-Headers',
      level: '提示',
      detail:
        '未声明可暴露的响应头：跨源 JS 默认只能读到几个简单响应头，自定义响应头需要在此列出。',
    })
  } else if (get(H.aceh) !== undefined) {
    findings.push({
      header: 'Access-Control-Expose-Headers',
      level: '通过',
      detail: `暴露响应头：${get(H.aceh)!.trim()}`,
    })
  }

  // ---- Access-Control-Max-Age ----
  const maxAgeRaw = get(H.acma)
  if (maxAgeRaw !== undefined) {
    const seconds = Number.parseInt(maxAgeRaw, 10)
    findings.push({
      header: 'Access-Control-Max-Age',
      level: Number.isFinite(seconds) && seconds >= 0 ? '通过' : '问题',
      detail: Number.isFinite(seconds)
        ? `预检结果可缓存 ${seconds} 秒，减少 OPTIONS 请求。`
        : `值无法解析为非负整数：${maxAgeRaw.trim()}`,
    })
  }

  // ---- Vary ----
  if (vary !== undefined && /\bOrigin\b/i.test(vary)) {
    findings.push({
      header: 'Vary',
      level: '通过',
      detail: `包含 Vary: ${vary.trim()}，按来源区分缓存。`,
    })
  }

  return findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
}

/** 汇总评级：有「问题」→ 不通过；有「风险」→ 需关注；否则基本合理 */
function verdict(findings: readonly Finding[]): { title: string; level: Level } {
  const has = (level: Level): boolean => findings.some((f) => f.level === level)
  if (has('问题')) return { title: '存在无效 / 会被浏览器拒绝的配置', level: '问题' }
  if (has('风险')) return { title: '可工作，但存在安全风险，建议收紧', level: '风险' }
  return { title: '未发现明显问题', level: '通过' }
}

/**
 * 离线 CORS 配置分析。
 * 空输入返回空串；解析不到任何 HTTP 头抛 CorsCheckError。
 */
export function transform(input: CorsCheckInput, _options?: CorsCheckOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new CorsCheckError('输入超过 200,000 字符上限')

  const headers = parseHeaders(input.text)
  if (headers.size === 0) {
    throw new CorsCheckError('没有解析到任何 HTTP 响应头（应为每行一个 “Name: value”）')
  }

  const findings = evaluate(headers)
  const counts = findings.reduce<Record<Level, number>>(
    (acc, f) => {
      acc[f.level] += 1
      return acc
    },
    { 问题: 0, 风险: 0, 提示: 0, 通过: 0 },
  )
  const result = verdict(findings)

  const lines: string[] = []
  lines.push('# CORS 配置检测报告')
  lines.push('')
  lines.push(`结论：【${result.level}】${result.title}`)
  lines.push(
    `统计：问题 ${counts.问题} · 风险 ${counts.风险} · 提示 ${counts.提示} · 通过 ${counts.通过}`,
  )
  lines.push('')
  lines.push('## 逐项结果')
  for (const f of findings) {
    lines.push(`- [${f.level}] ${f.header}`)
    lines.push(`    ${f.detail}`)
  }
  lines.push('')
  lines.push('> 检测基于粘贴的响应头做静态规则判断，不发起真实跨源请求。')
  return lines.join('\n')
}
