/**
 * userscript —— 全局编号 #773
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 油猴（Tampermonkey）用户脚本模板生成：==UserScript== 头注释 + 脚本骨架。
 * 纯字符串模板，无任何运行时依赖。
 */

export type UserscriptRunAt = 'document-start' | 'document-end' | 'document-idle'

export interface UserscriptMeta {
  name: string
  namespace: string
  version: string
  description: string
  author: string
  matches: string[]
  grants: string[]
  runAt: UserscriptRunAt
}

export const USERSCRIPT_RUN_AT: readonly UserscriptRunAt[] = [
  'document-start',
  'document-end',
  'document-idle',
]

/** Tampermonkey 常用 grant 白名单 */
export const VALID_GRANTS: readonly string[] = [
  'none',
  'unsafeWindow',
  'GM_setValue',
  'GM_getValue',
  'GM_deleteValue',
  'GM_listValues',
  'GM_addValueChangeListener',
  'GM_removeValueChangeListener',
  'GM_xmlhttpRequest',
  'GM_notification',
  'GM_openInTab',
  'GM_registerMenuCommand',
  'GM_unregisterMenuCommand',
  'GM_addStyle',
  'GM_getResourceText',
  'GM_getResourceURL',
  'GM_log',
  'GM_download',
  'GM_setClipboard',
  'window.close',
  'window.focus',
  'window.onurlchange',
]

const MATCH_PATTERN_RE = /^(\*|https?):\/\/([^/\s]+)(\/\S*)$/

export function validateUserMatchPattern(pattern: unknown): void {
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    throw new Error('匹配模式必须是非空字符串')
  }
  const p = pattern.trim()
  if (p === '<all_urls>') return
  if (!MATCH_PATTERN_RE.test(p)) {
    throw new Error(`非法匹配模式：${p}（应形如 https://example.com/* 或 <all_urls>）`)
  }
}

const VERSION_RE = /^\d+\.\d+\.\d+$/

export function validateUserscriptMeta(meta: UserscriptMeta): void {
  if (!meta || typeof meta !== 'object') {
    throw new Error('脚本元信息必须是对象')
  }
  for (const key of ['name', 'namespace', 'version', 'description'] as const) {
    if (typeof meta[key] !== 'string' || meta[key].trim() === '') {
      throw new Error(`${key} 不能为空`)
    }
  }
  if (!VERSION_RE.test(meta.version.trim())) {
    throw new Error(`version 必须是 x.y.z 数字版本号（如 1.0.0），当前：${meta.version}`)
  }
  if (!Array.isArray(meta.matches) || meta.matches.length === 0) {
    throw new Error('matches 至少需要一个匹配模式')
  }
  for (const m of meta.matches) {
    validateUserMatchPattern(m)
  }
  if (!Array.isArray(meta.grants)) {
    throw new Error('grants 必须是数组')
  }
  for (const g of meta.grants) {
    if (!VALID_GRANTS.includes(g)) {
      throw new Error(`未知 grant：${String(g)}`)
    }
  }
  if (meta.grants.includes('none') && meta.grants.length > 1) {
    throw new Error('grant 为 none 时不能与其他 grant 混用')
  }
  if (!USERSCRIPT_RUN_AT.includes(meta.runAt)) {
    throw new Error(`runAt 非法：${String(meta.runAt)}（可选 ${USERSCRIPT_RUN_AT.join(' / ')}）`)
  }
}

function pad(key: string): string {
  return `// @${key}`.padEnd(16, ' ')
}

/** 生成完整用户脚本（先校验，不合法抛中文错）。 */
export function generateUserscript(meta: UserscriptMeta): string {
  validateUserscriptMeta(meta)
  const grants = meta.grants.length > 0 ? meta.grants : ['none']
  const lines = [
    '// ==UserScript==',
    `${pad('name')}${meta.name.trim()}`,
    `${pad('namespace')}${meta.namespace.trim()}`,
    `${pad('version')}${meta.version.trim()}`,
    `${pad('description')}${meta.description.trim()}`,
  ]
  if (meta.author.trim() !== '') {
    lines.push(`${pad('author')}${meta.author.trim()}`)
  }
  for (const m of meta.matches) {
    lines.push(`${pad('match')}${String(m).trim()}`)
  }
  for (const g of grants) {
    lines.push(`${pad('grant')}${g}`)
  }
  lines.push(`${pad('run-at')}${meta.runAt}`)
  lines.push('// ==/UserScript==', '', '(function() {', "    'use strict';", '')
  if (grants.includes('GM_addStyle')) {
    lines.push('    // —— 注入自定义样式 ——', "    GM_addStyle('/* 你的 CSS 写在这里 */');", '')
  }
  if (grants.includes('GM_registerMenuCommand')) {
    lines.push(
      '    // —— 注册油猴菜单命令 ——',
      "    GM_registerMenuCommand('运行', () => {",
      '        main();',
      '    });',
      '',
    )
  }
  lines.push(
    '    // 你的代码写在这里',
    '    function main() {',
    "        console.log('[userscript] running on', location.href);",
    '    }',
    '    main();',
    '})();',
    '',
  )
  return lines.join('\n')
}

export type ParsedUserscriptInput = UserscriptMeta

/** 解析页面输入的 JSON 配置（非法抛中文错）。 */
export function parseUserscriptInput(text: string): ParsedUserscriptInput {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('输入必须是 JSON 对象')
  }
  const o = raw as Record<string, unknown>
  const parsed: ParsedUserscriptInput = {
    name: typeof o.name === 'string' ? o.name : '',
    namespace: typeof o.namespace === 'string' ? o.namespace : '',
    version: typeof o.version === 'string' ? o.version : '',
    description: typeof o.description === 'string' ? o.description : '',
    author: typeof o.author === 'string' ? o.author : '',
    matches: Array.isArray(o.matches) ? (o.matches as string[]) : [],
    grants: Array.isArray(o.grants) ? (o.grants as string[]) : [],
    runAt: typeof o.runAt === 'string' ? (o.runAt as UserscriptRunAt) : 'document-end',
  }
  validateUserscriptMeta(parsed)
  return parsed
}

export const EXAMPLE_USERSCRIPT: ParsedUserscriptInput = {
  name: '示例油猴脚本',
  namespace: 'https://toolbox.example/userscripts',
  version: '1.0.0',
  description: '在示例站点自动执行的小脚本',
  author: '',
  matches: ['https://example.com/*'],
  grants: ['none'],
  runAt: 'document-end',
}
