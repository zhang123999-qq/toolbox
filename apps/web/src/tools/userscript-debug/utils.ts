/**
 * userscript-debug —— 全局编号 #785
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 油猴（Tampermonkey）用户脚本调试扫描：
 * scanUserscript 扫描脚本源码，检查元数据块缺失/未闭合、@name/@version 缺失、
 * 非法 @match、未声明 @match/@include、GM_ 函数与 @grant 声明不一致，
 * 以及 document.write / eval 等风险写法，输出 issues[{line, level, message}]。
 * 纯字符串处理，无任何运行时依赖。
 */

export type UserscriptIssueLevel = 'error' | 'warning'

export interface UserscriptIssue {
  /** 1 起始行号，0 表示与具体行无关 */
  line: number
  level: UserscriptIssueLevel
  message: string
}

const META_START = '==UserScript=='
const META_END = '==/UserScript=='

function isValidMatchPattern(p: string): boolean {
  if (p === '<all_urls>') return true
  const m = /^(\*|https?|file|ftp):\/\/([^/\s]+)\/(\S*)$/.exec(p)
  if (!m) return false
  const host = m[2]
  if (host === '*') return true
  return host.split('.').every((part) => part === '*' || /^[A-Za-z0-9-]+$/.test(part))
}

export function scanUserscript(code: string): UserscriptIssue[] {
  const issues: UserscriptIssue[] = []
  const lines = code.split('\n')
  const startIdx = lines.findIndex((l) => l.includes(META_START))
  const endIdx = lines.findIndex((l) => l.includes(META_END))

  const push = (line: number, level: UserscriptIssueLevel, message: string): void => {
    issues.push({ line, level, message })
  }

  if (startIdx === -1) {
    push(0, 'error', '缺少 ==UserScript== 元数据块，脚本无法被脚本管理器识别')
    return issues
  }
  if (endIdx === -1 || endIdx < startIdx) {
    push(startIdx + 1, 'error', '元数据块未闭合（缺少 ==/UserScript==）')
  }

  const metas = new Map<string, string[]>()
  if (endIdx > startIdx) {
    for (let i = startIdx + 1; i < endIdx; i += 1) {
      const mm = /^\s*\/\/\s*@(\S+)\s*(.*)$/.exec(lines[i])
      if (mm) {
        const arr = metas.get(mm[1]) ?? []
        arr.push(mm[2].trim())
        metas.set(mm[1], arr)
      }
    }
  }
  const getMeta = (key: string): string[] => metas.get(key) ?? []

  if (getMeta('name').length === 0) {
    push(startIdx + 1, 'error', '缺少 @name，脚本必须声明名称')
  }
  const versions = getMeta('version')
  if (versions.length === 0) {
    push(startIdx + 1, 'error', '缺少 @version')
  } else if (!/^\d+\.\d+\.\d+/.test(versions[0])) {
    push(startIdx + 1, 'warning', `@version 建议使用 x.y.z 格式，当前为 ${versions[0]}`)
  }

  const matchPatterns = [...getMeta('match'), ...getMeta('include')]
  if (matchPatterns.length === 0) {
    push(startIdx + 1, 'warning', '未声明 @match / @include，脚本将在所有页面运行')
  }
  for (const p of matchPatterns) {
    if (!isValidMatchPattern(p)) {
      push(startIdx + 1, 'error', `非法 @match/@include 写法：${p}`)
    }
  }

  const grants = getMeta('grant')
  const used = new Set<string>()
  const gmRe = /\b(GM_[A-Za-z]+)\b/g
  for (const line of lines) {
    gmRe.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = gmRe.exec(line)) !== null) {
      used.add(m[1])
    }
  }
  if (used.size > 0) {
    if (grants.includes('none')) {
      push(0, 'warning', `声明了 @grant none，却使用了 ${[...used].join('、')}`)
    } else {
      for (const fn of used) {
        if (!grants.includes(fn)) {
          push(0, 'warning', `使用了 ${fn} 但未声明 @grant ${fn}`)
        }
      }
    }
  }

  lines.forEach((line, idx) => {
    if (/\bdocument\.write\s*\(/.test(line)) {
      push(idx + 1, 'warning', '避免使用 document.write，可能清空页面')
    }
    if (/(^|[^.\w])eval\s*\(/.test(line)) {
      push(idx + 1, 'warning', '使用了 eval，存在安全与性能风险')
    }
  })

  return issues
}

export function renderUserscriptIssues(issues: UserscriptIssue[]): string {
  if (issues.length === 0) {
    return '未发现问题：元数据块完整，GM_ 函数与 @grant 声明一致。'
  }
  const label: Record<UserscriptIssueLevel, string> = { error: '错误', warning: '警告' }
  return (
    `发现 ${issues.length} 个问题：\n` +
    issues
      .map(
        (i, idx) =>
          `${idx + 1}. [${label[i.level]}]${i.line > 0 ? ` 第 ${i.line} 行` : ''}：${i.message}`,
      )
      .join('\n')
  )
}
