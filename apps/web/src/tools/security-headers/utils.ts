import type { SecurityHeadersInput, SecurityHeadersOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class SecurityHeadersError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecurityHeadersError'
  }
}

const MAX_INPUT = 200_000

export type Level = '通过' | '风险' | '缺失' | '提示'

export interface HeaderFinding {
  readonly header: string
  readonly level: Level
  readonly detail: string
}

/** 解析原始 HTTP 响应头：跳过状态行与空行，同名头逗号合并，键统一小写 */
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

type MissingLevel = '风险' | '缺失' | '提示'

interface Check {
  readonly header: string
  readonly key: string
  /** 未返回该头时的等级 */
  readonly whenMissing: MissingLevel
  readonly missingDetail: string
  /** 返回该头时的评估；返回等级与说明 */
  evaluate(value: string): { level: Level; detail: string }
}

const CHECKS: readonly Check[] = [
  {
    header: 'Strict-Transport-Security',
    key: 'strict-transport-security',
    whenMissing: '风险',
    missingDetail: '缺少 HSTS：未强制浏览器后续都走 HTTPS，存在 SSL 剥离 / 降级风险。',
    evaluate: (value) => {
      const maxAgeMatch = /max-age\s*=\s*(\d+)/i.exec(value)
      if (maxAgeMatch === null) {
        return { level: '风险', detail: `未识别到 max-age：${value.trim()}` }
      }
      const age = Number(maxAgeMatch[1])
      if (age === 0) return { level: '风险', detail: 'max-age=0 等于关闭 HSTS。' }
      if (age < 15_552_000) {
        return { level: '提示', detail: `max-age=${age} 偏短（建议至少 6 个月 ≈ 15552000 秒）。` }
      }
      const extra = /includesubdomains/i.test(value) ? '，含 includeSubDomains' : ''
      const preload = /preload/i.test(value) ? '，含 preload' : ''
      return { level: '通过', detail: `已启用 HSTS（max-age=${age}${extra}${preload}）。` }
    },
  },
  {
    header: 'Content-Security-Policy',
    key: 'content-security-policy',
    whenMissing: '缺失',
    missingDetail: '缺少 CSP：没有限制脚本 / 样式 / 资源来源，XSS 缓解能力较弱。',
    evaluate: (value) => {
      const flags: string[] = []
      if (/unsafe-inline/i.test(value)) flags.push('unsafe-inline')
      if (/unsafe-eval/i.test(value)) flags.push('unsafe-eval')
      if (/(?:^|[\s;])(default-src|script-src)[^;]*\*/i.test(value)) flags.push('通配符来源 *')
      if (flags.length > 0) {
        return {
          level: '风险',
          detail: `已设置 CSP，但含放宽项：${flags.join('、')}，会削弱 XSS 防护。`,
        }
      }
      return {
        level: '通过',
        detail: '已设置 CSP，且未发现 unsafe-inline / unsafe-eval / 通配来源。',
      }
    },
  },
  {
    header: 'X-Frame-Options',
    key: 'x-frame-options',
    whenMissing: '提示',
    missingDetail:
      '缺少 X-Frame-Options（或 CSP frame-ancestors）：页面可能被任意站点 iframe 嵌套，存在点击劫持风险。',
    evaluate: (value) => {
      if (/^deny$/i.test(value.trim()) || /^sameorigin$/i.test(value.trim())) {
        return { level: '通过', detail: `取值 ${value.trim().toUpperCase()}，限制了被嵌套。` }
      }
      if (/allow-?all/i.test(value)) {
        return { level: '风险', detail: 'ALLOWALL 等于不设防，建议 DENY 或 SAMEORIGIN。' }
      }
      return { level: '提示', detail: `非标准取值：${value.trim()}` }
    },
  },
  {
    header: 'X-Content-Type-Options',
    key: 'x-content-type-options',
    whenMissing: '提示',
    missingDetail: '缺少 X-Content-Type-Options: nosniff，浏览器可能对响应做 MIME 嗅探。',
    evaluate: (value) =>
      /^nosniff$/i.test(value.trim())
        ? { level: '通过', detail: 'nosniff：禁用 MIME 嗅探。' }
        : { level: '风险', detail: `取值应为 nosniff，当前：${value.trim()}` },
  },
  {
    header: 'Referrer-Policy',
    key: 'referrer-policy',
    whenMissing: '提示',
    missingDetail:
      '未设置 Referrer-Policy，默认可能把完整 URL（含查询参数）通过 Referer 泄露给第三方。',
    evaluate: (value) => {
      if (/unsafe-url/i.test(value)) {
        return {
          level: '风险',
          detail:
            'unsafe-url 会始终发送完整 URL，建议 strict-origin-when-cross-origin 等更严格策略。',
        }
      }
      return { level: '通过', detail: `策略：${value.trim()}` }
    },
  },
  {
    header: 'Permissions-Policy',
    key: 'permissions-policy',
    whenMissing: '提示',
    missingDetail: '未设置 Permissions-Policy，未收敛摄像头 / 麦克风 / 定位等强大能力的可用性。',
    evaluate: (value) => ({
      level: '通过',
      detail: `已限制浏览器能力：${value.trim().slice(0, 80)}`,
    }),
  },
  {
    header: 'X-XSS-Protection',
    key: 'x-xss-protection',
    whenMissing: '提示',
    missingDetail:
      '可忽略：现代浏览器已移除该过滤器，不设置也无妨；若设置建议为 0 以免引入旧漏洞。',
    evaluate: (value) =>
      value.trim() === '0'
        ? { level: '通过', detail: '设为 0，显式关闭已废弃的旧过滤器（推荐）。' }
        : { level: '提示', detail: `该头已废弃，建议设为 0；当前：${value.trim()}` },
  },
]

/** 信息泄露类响应头：出现即提示 */
const DISCLOSURE_HEADERS: readonly { key: string; header: string }[] = [
  { key: 'server', header: 'Server' },
  { key: 'x-powered-by', header: 'X-Powered-By' },
  { key: 'x-aspnet-version', header: 'X-AspNet-Version' },
  { key: 'x-generator', header: 'X-Generator' },
]

/** 对一组响应头执行全部检查 */
export function evaluate(headers: ReadonlyMap<string, string>): HeaderFinding[] {
  const findings: HeaderFinding[] = CHECKS.map((check) => {
    const value = headers.get(check.key)
    if (value === undefined) {
      return { header: check.header, level: check.whenMissing, detail: check.missingDetail }
    }
    return { header: check.header, ...check.evaluate(value) }
  })

  for (const item of DISCLOSURE_HEADERS) {
    const value = headers.get(item.key)
    if (value !== undefined) {
      findings.push({
        header: item.header,
        level: '提示',
        detail: `回显了服务端技术栈（${value.trim()}），建议在生产环境隐藏以减少信息泄露。`,
      })
    }
  }

  // CSP 里带 frame-ancestors 可弥补 X-Frame-Options 缺失
  const csp = headers.get('content-security-policy')
  if (csp && /frame-ancestors/i.test(csp)) {
    const index = findings.findIndex((f) => f.header === 'X-Frame-Options' && f.level === '提示')
    if (index !== -1) {
      findings[index] = {
        header: 'X-Frame-Options',
        level: '通过',
        detail: '虽未设 X-Frame-Options，但 CSP 含 frame-ancestors，可同样防点击劫持。',
      }
    }
  }

  return findings
}

function verdict(findings: readonly HeaderFinding[]): { title: string; level: Level } {
  if (findings.some((f) => f.level === '风险'))
    return { title: '存在高风险项，建议尽快修复', level: '风险' }
  const missingImportant = findings.filter(
    (f) => f.level === '缺失' || (f.level === '提示' && f.header === 'X-Frame-Options'),
  ).length
  if (missingImportant > 0) return { title: '基础安全头不完整，建议补齐', level: '缺失' }
  return { title: '未发现明显问题', level: '通过' }
}

/**
 * 离线安全响应头检测。
 * 空输入返回空串；解析不到任何 HTTP 头抛 SecurityHeadersError。
 */
export function transform(input: SecurityHeadersInput, _options?: SecurityHeadersOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new SecurityHeadersError('输入超过 200,000 字符上限')

  const headers = parseHeaders(input.text)
  if (headers.size === 0) {
    throw new SecurityHeadersError('没有解析到任何 HTTP 响应头（应为每行一个 “Name: value”）')
  }

  const findings = evaluate(headers)
  const counts = findings.reduce<Record<Level, number>>(
    (acc, f) => {
      acc[f.level] += 1
      return acc
    },
    { 风险: 0, 缺失: 0, 提示: 0, 通过: 0 },
  )
  const result = verdict(findings)

  const lines: string[] = []
  lines.push('# 安全响应头检测报告')
  lines.push('')
  lines.push(`结论：【${result.level}】${result.title}`)
  lines.push(
    `统计：风险 ${counts.风险} · 缺失 ${counts.缺失} · 提示 ${counts.提示} · 通过 ${counts.通过}`,
  )
  lines.push('')
  lines.push('## 逐项结果')
  for (const f of findings) {
    lines.push(`- [${f.level}] ${f.header}`)
    lines.push(`    ${f.detail}`)
  }
  lines.push('')
  lines.push('> 检测基于粘贴的响应头做静态规则判断，不发起真实网络请求。')
  return lines.join('\n')
}
