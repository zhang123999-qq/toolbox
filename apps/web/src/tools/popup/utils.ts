/**
 * popup —— 全局编号 #780
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 浏览器扩展 Popup 弹出页模板生成：popup.html / popup.js / popup.css 三文件。
 * 可选特性：tabs（当前标签页信息）、storage（配置读写）、i18n（国际化示例）。
 * 纯字符串模板，无任何运行时依赖。
 */

export type PopupFeature = 'tabs' | 'storage' | 'i18n'

export interface PopupOptions {
  title: string
  width: number
  height: number
  features: PopupFeature[]
}

export interface PopupFiles {
  html: string
  js: string
  css: string
}

/** Chrome popup 尺寸上限：800 × 600 */
export const POPUP_MAX_WIDTH = 800
export const POPUP_MAX_HEIGHT = 600

export const FEATURE_VALUES: readonly PopupFeature[] = ['tabs', 'storage', 'i18n']

export const FEATURE_LABELS: Record<PopupFeature, string> = {
  tabs: '当前标签页信息（chrome.tabs）',
  storage: '配置读写（chrome.storage.sync）',
  i18n: '国际化示例（chrome.i18n）',
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function validatePopupSize(width: unknown, height: unknown): void {
  const dims: Array<[string, unknown, number]> = [
    ['width', width, POPUP_MAX_WIDTH],
    ['height', height, POPUP_MAX_HEIGHT],
  ]
  for (const [name, value, max] of dims) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error(`${name} 必须是整数`)
    }
    if (value < 1 || value > max) {
      throw new Error(
        `${name} 超出范围（1–${max}，Chrome popup 上限 ${POPUP_MAX_WIDTH}×${POPUP_MAX_HEIGHT}）`,
      )
    }
  }
}

export function validatePopupOptions(opts: PopupOptions): void {
  if (!opts) throw new Error('配置不能为空')
  if (typeof opts.title !== 'string' || opts.title.trim() === '') {
    throw new Error('title 必须是非空字符串')
  }
  validatePopupSize(opts.width, opts.height)
  if (!Array.isArray(opts.features)) {
    throw new Error('features 必须是数组')
  }
  for (const f of opts.features) {
    if (!FEATURE_VALUES.includes(f)) {
      throw new Error(`未知特性：${String(f)}（可选 ${FEATURE_VALUES.join(' / ')}）`)
    }
  }
}

const JS_SNIPPETS: Record<PopupFeature, string> = {
  tabs: `// 特性：tabs —— 读取当前标签页标题与 URL（manifest 需声明 "tabs" 权限或 activeTab）
document.getElementById('btn-tab').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  document.getElementById('tab-info').textContent =
    tab ? \`标题：\${tab.title}\\nURL：\${tab.url}\` : '未找到当前标签页'
})`,
  storage: `// 特性：storage —— 配置读写（manifest 需声明 "storage" 权限）
const KEY = 'demo-setting'
document.getElementById('btn-save').addEventListener('click', async () => {
  const value = document.getElementById('setting-input').value
  await chrome.storage.sync.set({ [KEY]: value })
  document.getElementById('storage-info').textContent = '已保存'
})
chrome.storage.sync.get([KEY]).then((result) => {
  if (result[KEY]) document.getElementById('setting-input').value = result[KEY]
})`,
  i18n: `// 特性：i18n —— 国际化文案（需在 _locales/<lang>/messages.json 中定义）
document.querySelectorAll('[data-i18n]').forEach((el) => {
  const key = el.getAttribute('data-i18n')
  if (key) el.textContent = chrome.i18n.getMessage(key)
})`,
}

const HTML_SNIPPETS: Record<PopupFeature, string> = {
  tabs: `    <section>
      <button id="btn-tab" type="button">读取当前标签页</button>
      <pre id="tab-info"></pre>
    </section>`,
  storage: `    <section>
      <input id="setting-input" type="text" placeholder="输入要保存的配置" />
      <button id="btn-save" type="button">保存配置</button>
      <p id="storage-info"></p>
    </section>`,
  i18n: `    <section>
      <p data-i18n="popup_hello">Hello（将被 i18n 文案替换）</p>
    </section>`,
}

export function generatePopup(opts: PopupOptions): PopupFiles {
  validatePopupOptions(opts)
  const title = escapeHtml(opts.title.trim())
  const features = [...new Set(opts.features)]

  const sections = features.map((f) => HTML_SNIPPETS[f]).join('\n')
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <main>
    <h1>${title}</h1>
${sections}
  </main>
  <script src="popup.js"></script>
</body>
</html>
`

  const jsParts = [
    '// popup.js 模板（#780 自动生成，Manifest V3）',
    ...features.map((f) => JS_SNIPPETS[f]),
  ]
  const js = jsParts.join('\n\n') + '\n'

  const css = `/* popup.css 模板（#780 自动生成） */
body {
  width: ${opts.width}px;
  min-height: ${opts.height}px;
  margin: 0;
  font-size: 14px;
}
main {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
h1 {
  font-size: 16px;
  margin: 0;
}
section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
pre {
  white-space: pre-wrap;
  word-break: break-all;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}
`

  return { html, js, css }
}

export function renderPopupFiles(files: PopupFiles): string {
  return [
    '===== popup.html =====',
    files.html.trimEnd(),
    '',
    '===== popup.js =====',
    files.js.trimEnd(),
    '',
    '===== popup.css =====',
    files.css.trimEnd(),
  ].join('\n')
}

export function parsePopupInput(text: string): PopupOptions {
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
  const opts: PopupOptions = {
    title: typeof o.title === 'string' ? o.title : '',
    width: o.width as number,
    height: o.height as number,
    features: Array.isArray(o.features) ? (o.features as PopupFeature[]) : [],
  }
  validatePopupOptions(opts)
  return opts
}

export const EXAMPLE_INPUT: PopupOptions = {
  title: '我的扩展',
  width: 360,
  height: 480,
  features: ['tabs', 'storage'],
}
