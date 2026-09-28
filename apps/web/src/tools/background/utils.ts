/**
 * background —— 全局编号 #779
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * MV3 Service Worker 后台脚本模板生成：按所选事件拼接代码片段。
 * 纯字符串模板，无任何运行时依赖。
 * 说明：MV3 不支持 persistent 后台页，Service Worker 会被浏览器随时休眠，
 * 周期任务请用 chrome.alarms（见 keepAlive 注释片段）。
 */

export type BackgroundEvent =
  'alarms' | 'runtime.onInstalled' | 'contextMenus' | 'runtime.onMessage' | 'tabs.onUpdated'

export interface BackgroundOptions {
  events: BackgroundEvent[]
  keepAlive?: boolean
}

export const EVENT_VALUES: readonly BackgroundEvent[] = [
  'alarms',
  'runtime.onInstalled',
  'contextMenus',
  'runtime.onMessage',
  'tabs.onUpdated',
]

export const EVENT_LABELS: Record<BackgroundEvent, string> = {
  alarms: '定时任务（chrome.alarms）',
  'runtime.onInstalled': '安装/更新钩子（runtime.onInstalled）',
  contextMenus: '右键菜单（contextMenus）',
  'runtime.onMessage': '消息通信（runtime.onMessage）',
  'tabs.onUpdated': '标签页更新监听（tabs.onUpdated）',
}

const EVENT_SNIPPETS: Record<BackgroundEvent, string> = {
  alarms: `// 定时任务：每 1 分钟触发一次（manifest 需声明 "alarms" 权限）
chrome.alarms.create('tick', { periodInMinutes: 1 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tick') {
    console.log('[background] 定时触发')
    // TODO: 在此执行周期任务
  }
})`,
  'runtime.onInstalled': `// 安装 / 更新 / 浏览器升级时触发一次
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[background] 安装原因：', details.reason)
  if (details.reason === 'install') {
    // TODO: 初始化默认配置，如 chrome.storage.sync.set({...})
  }
})`,
  contextMenus: `// 右键菜单：安装时创建，点击时处理（manifest 需声明 "contextMenus" 权限）
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'demo-action',
    title: '用扩展处理 "%s"',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'demo-action') {
    console.log('[background] 选中文本：', info.selectionText, '来自标签页：', tab?.id)
    // TODO: 处理选中文本
  }
})`,
  'runtime.onMessage': `// 与 content script / popup 的消息通信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[background] 收到消息：', message, '来自：', sender.tab?.id ?? '扩展页面')
  // TODO: 按 message.type 分发处理
  sendResponse({ ok: true })
  return true // 异步响应时保持通道开启
})`,
  'tabs.onUpdated': `// 标签页更新监听（manifest 需声明 "tabs" 权限以读取 url）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('[background] 页面加载完成：', tab.url)
    // TODO: 按 URL 规则处理
  }
})`,
}

const HEADER_COMMENT = `// background service worker 模板（#779 自动生成，Manifest V3）
// 在 manifest.json 中声明：
//   "background": { "service_worker": "background.js" }
// 注意：MV3 的 Service Worker 不可常驻，浏览器会在空闲时休眠；
`

const KEEPALIVE_NOTE = `// 关于"保活"：MV3 明确不支持 persistent 后台页，任何让 Service Worker
// 常驻的技巧都不可靠。正确做法：
//   1. 周期任务用 chrome.alarms（最小间隔 1 分钟，Chrome 120+ 支持 30 秒）；
//   2. 需要即时唤醒的场景由事件（onMessage / onAlarm / onClicked）驱动；
//   3. 状态持久化到 chrome.storage，不要放在内存变量里。
chrome.alarms.create('keepalive-hint', { periodInMinutes: 1 })`

export function validateBackgroundOptions(opts: BackgroundOptions): void {
  if (!opts || !Array.isArray(opts.events) || opts.events.length === 0) {
    throw new Error('events 至少需要选择一个事件')
  }
  for (const e of opts.events) {
    if (!EVENT_VALUES.includes(e)) {
      throw new Error(`未知事件：${String(e)}（可选 ${EVENT_VALUES.join(' / ')}）`)
    }
  }
  if (opts.keepAlive !== undefined && typeof opts.keepAlive !== 'boolean') {
    throw new Error('keepAlive 必须是布尔值')
  }
}

export function generateBackground(opts: BackgroundOptions): string {
  validateBackgroundOptions(opts)
  const events = [...new Set(opts.events)]
  const parts: string[] = [HEADER_COMMENT.trimEnd()]
  for (const e of events) {
    parts.push(EVENT_SNIPPETS[e])
  }
  if (opts.keepAlive === true) {
    parts.push(KEEPALIVE_NOTE)
  }
  return parts.join('\n\n')
}

export function parseBackgroundInput(text: string): BackgroundOptions {
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
  const opts: BackgroundOptions = {
    events: Array.isArray(o.events) ? (o.events as BackgroundEvent[]) : [],
  }
  if (o.keepAlive !== undefined) {
    opts.keepAlive = o.keepAlive as boolean
  }
  validateBackgroundOptions(opts)
  return opts
}

export const EXAMPLE_INPUT: BackgroundOptions = {
  events: ['runtime.onInstalled', 'runtime.onMessage', 'alarms'],
  keepAlive: false,
}
