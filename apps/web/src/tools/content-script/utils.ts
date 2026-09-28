/**
 * content-script —— 全局编号 #772
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * Content Script 模板生成：按 matches / run_at / 可选特性拼接 content.js 代码。
 * 纯字符串模板，无任何运行时依赖。
 */

export type ContentScriptRunAt = 'document_start' | 'document_end' | 'document_idle'
export type ContentScriptFeature = 'dom-observe' | 'context-menu' | 'storage-sync'

export interface ContentScriptOptions {
  matches: string[]
  runAt: ContentScriptRunAt
  features: ContentScriptFeature[]
}

export const RUN_AT_VALUES: readonly ContentScriptRunAt[] = [
  'document_start',
  'document_end',
  'document_idle',
]
export const FEATURE_VALUES: readonly ContentScriptFeature[] = [
  'dom-observe',
  'context-menu',
  'storage-sync',
]

export const FEATURE_LABELS: Record<ContentScriptFeature, string> = {
  'dom-observe': 'DOM 监听（MutationObserver）',
  'context-menu': '右键菜单协作（上报选中文本）',
  'storage-sync': 'chrome.storage.sync 读写示例',
}

/** Chrome Match Pattern：<all_urls> 或 scheme://host/path（scheme ∈ *,http,https） */
const MATCH_PATTERN_RE = /^(\*|https?):\/\/([^/\s]+)(\/\S*)$/

export function validateMatchPattern(pattern: unknown): void {
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    throw new Error('匹配模式必须是非空字符串')
  }
  const p = pattern.trim()
  if (p === '<all_urls>') return
  if (!MATCH_PATTERN_RE.test(p)) {
    throw new Error(`非法匹配模式：${p}（应形如 https://example.com/* 或 <all_urls>）`)
  }
}

export function validateContentScriptOptions(opts: ContentScriptOptions): void {
  if (!opts || !Array.isArray(opts.matches) || opts.matches.length === 0) {
    throw new Error('matches 至少需要一个匹配模式')
  }
  for (const m of opts.matches) {
    validateMatchPattern(m)
  }
  if (!RUN_AT_VALUES.includes(opts.runAt)) {
    throw new Error(`runAt 非法：${String(opts.runAt)}（可选 ${RUN_AT_VALUES.join(' / ')}）`)
  }
  if (!Array.isArray(opts.features)) {
    throw new Error('features 必须是数组')
  }
  for (const f of opts.features) {
    if (!FEATURE_VALUES.includes(f)) {
      throw new Error(`未知特性：${String(f)}（可选 ${FEATURE_VALUES.join(' / ')}）`)
    }
  }
}

function domObserveBlock(): string {
  return [
    '',
    '  // —— DOM 监听（MutationObserver）：新增节点时通知 background ——',
    '  const observer = new MutationObserver((mutations) => {',
    '    for (const m of mutations) {',
    '      if (m.addedNodes.length > 0) {',
    "        notifyBackground({ kind: 'dom-changed', added: m.addedNodes.length });",
    '      }',
    '    }',
    '  });',
    '  observer.observe(document.documentElement, { childList: true, subtree: true });',
  ].join('\n')
}

function contextMenuBlock(): string {
  return [
    '',
    '  // —— 右键菜单协作：content script 不能直接创建 contextMenus，',
    '  //    把选中文本发给 background，由 background 调用 chrome.contextMenus ——',
    "  document.addEventListener('contextmenu', () => {",
    '    const selection = window.getSelection ? window.getSelection().toString() : \'\';',
    "    notifyBackground({ kind: 'contextmenu', selection });",
    '  });',
  ].join('\n')
}

function storageSyncBlock(): string {
  return [
    '',
    '  // —— chrome.storage.sync 读写示例 ——',
    '  async function loadSettings() {',
    '    const data = await chrome.storage.sync.get({ enabled: true });',
    '    return data;',
    '  }',
    '  async function saveSettings(patch) {',
    '    await chrome.storage.sync.set(patch);',
    '  }',
    "  loadSettings().then((settings) => notifyBackground({ kind: 'settings', settings }));",
  ].join('\n')
}

/** 生成 content.js 代码（先校验，不合法抛中文错）。 */
export function generateContentScript(opts: ContentScriptOptions): string {
  validateContentScriptOptions(opts)
  const features = [...new Set(opts.features)]
  const lines = [
    '// 由 Toolbox「Content Script 模板 (#772)」生成',
    `// matches: ${opts.matches.join(', ')}`,
    `// run_at: ${opts.runAt}`,
    `// features: ${features.length > 0 ? features.join(', ') : '（无）'}`,
    '(() => {',
    "  'use strict';",
    '',
    '  // —— 与扩展其他部分的消息通信 ——',
    '  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {',
    "    if (message && message.type === 'ping') {",
    "      sendResponse({ type: 'pong', url: location.href });",
    '    }',
    '    return false;',
    '  });',
    '',
    '  // —— 向 background / service worker 发送消息 ——',
    '  function notifyBackground(payload) {',
    "    chrome.runtime.sendMessage({ type: 'content-event', payload });",
    '  }',
  ]
  if (features.includes('dom-observe')) lines.push(domObserveBlock())
  if (features.includes('context-menu')) lines.push(contextMenuBlock())
  if (features.includes('storage-sync')) lines.push(storageSyncBlock())
  lines.push('})();', '')
  return lines.join('\n')
}

export interface ParsedContentScriptInput {
  matches: string[]
  runAt: ContentScriptRunAt
  features: ContentScriptFeature[]
}

/** 解析页面输入的 JSON 配置（非法抛中文错）。 */
export function parseContentScriptInput(text: string): ParsedContentScriptInput {
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
  const parsed: ParsedContentScriptInput = {
    matches: Array.isArray(o.matches) ? (o.matches as string[]) : [],
    runAt: typeof o.runAt === 'string' ? (o.runAt as ContentScriptRunAt) : 'document_idle',
    features: Array.isArray(o.features) ? (o.features as ContentScriptFeature[]) : [],
  }
  validateContentScriptOptions(parsed)
  return parsed
}

export const EXAMPLE_INPUT: ParsedContentScriptInput = {
  matches: ['https://example.com/*'],
  runAt: 'document_idle',
  features: ['dom-observe', 'storage-sync'],
}
