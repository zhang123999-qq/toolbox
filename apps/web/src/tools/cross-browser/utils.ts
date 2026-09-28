/**
 * cross-browser —— 全局编号 #778
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 跨浏览器兼容：chrome.* / browser.* API 差异对照表、垫片代码生成、
 * 扩展代码中 chrome.* 调用点的兼容性扫描。纯数据与字符串模板，无运行时依赖。
 */

export type PromiseStyle = 'promise' | 'callback' | 'unsupported'

export interface ApiCompat {
  chromeApi: string
  firefox: PromiseStyle
  safari: PromiseStyle
  notes: string
}

export interface CompatFinding {
  api: string
  index: number
  firefox: PromiseStyle
  safari: PromiseStyle
  suggestion: string
}

export type CrossBrowserTask = 'polyfill' | 'scan'

export interface CrossBrowserInput {
  task: CrossBrowserTask
  apis?: string[]
  code?: string
}

export const API_COMPAT: Record<string, ApiCompat> = {
  'storage.sync': {
    chromeApi: 'chrome.storage.sync',
    firefox: 'promise',
    safari: 'promise',
    notes: '三端均支持 Promise 风格（Firefox/ Safari 用 browser.*，Chrome 132+ 支持 Promise）。',
  },
  'tabs.query': {
    chromeApi: 'chrome.tabs.query',
    firefox: 'promise',
    safari: 'promise',
    notes: '查询标签页；Safari 需 tabs 权限声明。',
  },
  'runtime.sendMessage': {
    chromeApi: 'chrome.runtime.sendMessage',
    firefox: 'promise',
    safari: 'promise',
    notes: '消息通信；Chrome 旧版为回调风格，132+ 支持 Promise。',
  },
  'alarms.create': {
    chromeApi: 'chrome.alarms.create',
    firefox: 'promise',
    safari: 'unsupported',
    notes: 'Safari 不支持 alarms API，需用 setTimeout 降级。',
  },
  'contextMenus.create': {
    chromeApi: 'chrome.contextMenus.create',
    firefox: 'promise',
    safari: 'unsupported',
    notes: 'Safari 不支持 contextMenus。',
  },
  'action.setBadgeText': {
    chromeApi: 'chrome.action.setBadgeText',
    firefox: 'promise',
    safari: 'unsupported',
    notes: 'Safari 不支持 action API；Firefox 109+ 支持 browser.action。',
  },
  'scripting.executeScript': {
    chromeApi: 'chrome.scripting.executeScript',
    firefox: 'promise',
    safari: 'promise',
    notes: 'MV3 动态注入脚本；需 scripting 权限与 host_permissions。',
  },
}

export function listApis(): string[] {
  return Object.keys(API_COMPAT)
}

export function getApiCompat(api: unknown): ApiCompat {
  if (typeof api !== 'string' || api.trim() === '') {
    throw new Error('API 名必须是非空字符串')
  }
  const key = api.trim()
  const compat = API_COMPAT[key]
  if (!compat) {
    throw new Error(`未知 API：${key}（可用：${listApis().join(' / ')}）`)
  }
  return compat
}

export function styleLabel(style: PromiseStyle): string {
  if (style === 'promise') return 'Promise'
  if (style === 'callback') return '回调'
  return '不支持'
}

/** 各 API 的回调转 Promise 垫片片段（browser 全局缺失时回退到 chrome 回调封装） */
const POLYFILL_SNIPPETS: Record<string, string> = {
  'storage.sync': `async function storageSyncGet(keys) {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) {
    return browser.storage.sync.get(keys)
  }
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(result)
    })
  })
}`,
  'tabs.query': `async function tabsQuery(queryInfo) {
  if (typeof browser !== 'undefined' && browser.tabs) {
    return browser.tabs.query(queryInfo)
  }
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(tabs)
    })
  })
}`,
  'runtime.sendMessage': `async function runtimeSendMessage(message) {
  if (typeof browser !== 'undefined' && browser.runtime) {
    return browser.runtime.sendMessage(message)
  }
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(response)
    })
  })
}`,
  'alarms.create': `function alarmsCreate(name, alarmInfo) {
  // Safari 不支持 alarms：降级为 setTimeout（仅演示，生产请按需持久化）
  if (typeof browser !== 'undefined' && browser.alarms) {
    return browser.alarms.create(name, alarmInfo)
  }
  if (chrome.alarms) {
    return chrome.alarms.create(name, alarmInfo)
  }
  const delayMs = (alarmInfo.periodInMinutes || 1) * 60 * 1000
  return setTimeout(() => console.warn('[alarms 降级] 定时触发：' + name), delayMs)
}`,
  'contextMenus.create': `function contextMenusCreate(createProperties) {
  const api = (typeof browser !== 'undefined' && browser.contextMenus)
    ? browser.contextMenus
    : chrome.contextMenus
  if (!api) throw new Error('当前浏览器不支持 contextMenus API')
  return api.create(createProperties)
}`,
  'action.setBadgeText': `async function actionSetBadgeText(details) {
  const api = (typeof browser !== 'undefined' && browser.action)
    ? browser.action
    : chrome.action
  if (!api) throw new Error('当前浏览器不支持 action API（Safari 请用 browserAction 方案）')
  return api.setBadgeText(details)
}`,
  'scripting.executeScript': `async function scriptingExecuteScript(injection) {
  if (typeof browser !== 'undefined' && browser.scripting) {
    return browser.scripting.executeScript(injection)
  }
  return chrome.scripting.executeScript(injection)
}`,
}

const POLYFILL_HEADER = `// cross-browser 垫片（#778 自动生成）
// 用法：直接调用以下包装函数；在 Firefox/Safari 优先使用 browser.* Promise，
// 在 Chrome 回退为回调转 Promise。按需复制所需函数即可。
`

export function generatePolyfill(apis: unknown): string {
  if (!Array.isArray(apis) || apis.length === 0) {
    throw new Error('至少选择一个 API')
  }
  const seen = new Set<string>()
  const blocks: string[] = []
  for (const a of apis) {
    if (typeof a !== 'string' || a.trim() === '') {
      throw new Error('API 名必须是非空字符串')
    }
    const key = a.trim()
    const compat = getApiCompat(key) // 未知 API 直接抛错
    if (seen.has(key)) continue
    seen.add(key)
    blocks.push(
      `// ${compat.chromeApi}：Firefox=${styleLabel(compat.firefox)} / Safari=${styleLabel(compat.safari)}\n// ${compat.notes}\n${POLYFILL_SNIPPETS[key]}`,
    )
  }
  return POLYFILL_HEADER + blocks.join('\n\n')
}

const CHROME_USAGE_RE = /chrome\.([a-zA-Z][a-zA-Z0-9]*)(?:\.([a-zA-Z][a-zA-Z0-9]*))?/g

export function scanChromeUsage(code: unknown): CompatFinding[] {
  if (typeof code !== 'string' || code.trim() === '') {
    throw new Error('待扫描代码必须是非空字符串')
  }
  const findings: CompatFinding[] = []
  const seen = new Set<string>()
  const re = new RegExp(CHROME_USAGE_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    const key = m[2] === undefined ? m[1] : `${m[1]}.${m[2]}`
    if (seen.has(key)) continue
    seen.add(key)
    const compat = API_COMPAT[key]
    if (compat) {
      findings.push({
        api: key,
        index: m.index,
        firefox: compat.firefox,
        safari: compat.safari,
        suggestion: `${compat.chromeApi}：Firefox=${styleLabel(compat.firefox)}，Safari=${styleLabel(compat.safari)}。${compat.notes}`,
      })
    } else {
      findings.push({
        api: key,
        index: m.index,
        firefox: 'unsupported',
        safari: 'unsupported',
        suggestion: `未收录的 API：${key}，请查阅 MDN 确认 Firefox / Safari 兼容性。`,
      })
    }
  }
  return findings
}

export function parseCrossBrowserInput(text: string): CrossBrowserInput {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('输入不能为空')
  }
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
  if (o.task !== 'polyfill' && o.task !== 'scan') {
    throw new Error("task 非法（可选 'polyfill' / 'scan'）")
  }
  const out: CrossBrowserInput = { task: o.task }
  if (o.task === 'polyfill') {
    if (!Array.isArray(o.apis)) throw new Error('polyfill 任务需要 apis 数组')
    out.apis = o.apis
  } else {
    if (typeof o.code !== 'string') throw new Error('scan 任务需要 code 字符串')
    out.code = o.code
  }
  return out
}

export function runCrossBrowser(input: CrossBrowserInput): string {
  if (input.task === 'polyfill') {
    return generatePolyfill(input.apis)
  }
  const findings = scanChromeUsage(input.code)
  if (findings.length === 0) {
    return '未发现 chrome.* 调用。'
  }
  return findings
    .map(
      (f, i) =>
        `${i + 1}. ${f.api}（位置 ${f.index}）：Firefox=${styleLabel(f.firefox)} / Safari=${styleLabel(f.safari)}\n   ${f.suggestion}`,
    )
    .join('\n')
}

export const EXAMPLE_INPUT: CrossBrowserInput = {
  task: 'polyfill',
  apis: ['storage.sync', 'tabs.query'],
}
