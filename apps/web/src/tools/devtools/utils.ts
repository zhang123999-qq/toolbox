/**
 * devtools —— 全局编号 #782
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * Chrome DevTools 扩展面板模板生成：
 * generateDevtoolsPage 生成 devtools.html / panel.html / panel.js 三文件代码；
 * validateDevtoolsManifest 校验 manifest.json 中的 devtools_page 声明。
 * 纯字符串处理，无任何运行时依赖。
 */

export interface DevtoolsPageOptions {
  /** 面板标题（chrome.devtools.panels.create 的 title） */
  panelTitle: string
  /** 是否同时生成 sidebarPane 侧边栏示例代码 */
  sidebar?: boolean
}

export interface DevtoolsFiles {
  'devtools.html': string
  'panel.html': string
  'panel.js': string
}

export const EXAMPLE_DEVTOOLS: DevtoolsPageOptions = { panelTitle: '我的面板', sidebar: false }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function parseDevtoolsInput(text: string): DevtoolsPageOptions {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('输入必须是 JSON 对象，例如 {"panelTitle":"我的面板"}')
  }
  const o = raw as Record<string, unknown>
  if (typeof o.panelTitle !== 'string' || o.panelTitle.trim() === '') {
    throw new Error('panelTitle 不能为空')
  }
  if (o.sidebar !== undefined && typeof o.sidebar !== 'boolean') {
    throw new Error('sidebar 必须为布尔值')
  }
  return { panelTitle: o.panelTitle.trim(), sidebar: o.sidebar ?? false }
}

export function generateDevtoolsPage(opts: DevtoolsPageOptions): DevtoolsFiles {
  const title = escapeHtml(opts.panelTitle)
  const sidebarJs = opts.sidebar
    ? `
// 可选：在 Elements 面板添加侧边栏
chrome.devtools.panels.elements.createSidebarPane('检查信息', (sidebar) => {
  sidebar.setExpression('document.title');
});
`
    : ''
  const devtoolsHtml = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script src="devtools.js"></script>
  </body>
</html>
`
  const panelHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 12px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div id="app">面板内容写在这里</div>
    <script src="panel.js"></script>
  </body>
</html>
`
  const panelJs = `// DevTools 面板脚本：可通过 chrome.devtools.inspectedWindow 与被检查页面通信
chrome.devtools.panels.create('${opts.panelTitle.replace(/'/g, "\\'")}', '', 'panel.html', (panel) => {
  panel.onShown.addListener((win) => {
    // 面板显示时的初始化逻辑
    console.log('面板已显示', win.location.href);
  });
});
${sidebarJs}`.trimStart()
  return { 'devtools.html': devtoolsHtml, 'panel.html': panelHtml, 'panel.js': panelJs }
}

/** 校验 manifest.json 中的 devtools_page 声明，返回问题列表（空数组表示通过） */
export function validateDevtoolsManifest(manifestText: string): string[] {
  let m: unknown
  try {
    m = JSON.parse(manifestText)
  } catch {
    return ['manifest.json 不是合法 JSON']
  }
  if (typeof m !== 'object' || m === null || Array.isArray(m)) {
    return ['manifest.json 根节点必须是对象']
  }
  const o = m as Record<string, unknown>
  const issues: string[] = []
  if (o.manifest_version !== 3) {
    issues.push('manifest_version 应为 3（DevTools 扩展需 Manifest V3）')
  }
  const page = o.devtools_page
  if (typeof page !== 'string' || page.trim() === '') {
    issues.push('缺少 devtools_page 声明（应在 manifest.json 顶层指定 HTML 文件）')
  } else if (!page.trim().endsWith('.html')) {
    issues.push('devtools_page 应指向 .html 文件')
  }
  return issues
}

export function renderDevtoolsFiles(files: DevtoolsFiles): string {
  return (
    `===== devtools.html =====\n${files['devtools.html']}\n` +
    `===== panel.html =====\n${files['panel.html']}\n` +
    `===== panel.js =====\n${files['panel.js']}`
  )
}
