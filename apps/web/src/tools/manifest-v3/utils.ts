/**
 * manifest-v3（#771）纯函数：浏览器扩展 Manifest V3 生成与校验。
 * A 级工具：纯前端本地计算，无网络、无第三方 API。
 */

export interface ContentScriptDef {
  matches: string[]
  js: string[]
  css?: string[]
  runAt?: 'document_start' | 'document_idle' | 'document_end'
}

export interface ManifestAction {
  defaultTitle?: string
  defaultPopup?: string
}

export interface ManifestV3Input {
  name: string
  version: string
  description?: string
  permissions: string[]
  hostPermissions: string[]
  action?: ManifestAction
  backgroundServiceWorker?: string
  contentScripts?: ContentScriptDef[]
}

/** Chrome 已知权限表（未知权限给出警告式错误） */
export const KNOWN_PERMISSIONS = [
  'activeTab',
  'alarms',
  'bookmarks',
  'browsingData',
  'clipboardRead',
  'clipboardWrite',
  'contentSettings',
  'contextMenus',
  'cookies',
  'debugger',
  'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess',
  'declarativeNetRequestFeedback',
  'downloads',
  'geolocation',
  'history',
  'identity',
  'idle',
  'notifications',
  'pageCapture',
  'proxy',
  'scripting',
  'search',
  'sessions',
  'storage',
  'tabGroups',
  'tabs',
  'topSites',
  'tts',
  'unlimitedStorage',
  'webNavigation',
  'webRequest',
]

const VERSION_RE = /^\d+(\.\d+){0,3}$/
const HOST_RE = /^(<all_urls>|(\*|https?|file|ftp|ws|wss):\/\/[^/\s]*\/?\*?)$/
const RUN_AT = ['document_start', 'document_idle', 'document_end']

/** 校验（返回中文错误列表，为空表示通过） */
export function validateManifestV3(input: ManifestV3Input): string[] {
  const errors: string[] = []
  if (input.name.trim() === '') errors.push('name 不能为空')
  if (!VERSION_RE.test(input.version)) errors.push('version 必须是 1～4 段数字版本号（如 1.0.0）')
  for (const p of input.permissions) {
    if (!KNOWN_PERMISSIONS.includes(p)) errors.push('未知权限：' + p)
  }
  for (const h of input.hostPermissions) {
    if (!HOST_RE.test(h)) errors.push('host_permissions 格式非法：' + h)
  }
  for (const [i, cs] of (input.contentScripts ?? []).entries()) {
    if (cs.matches.length === 0) errors.push('content_scripts[' + i + '].matches 不能为空')
    if (cs.js.length === 0) errors.push('content_scripts[' + i + '].js 不能为空')
    if (cs.runAt !== undefined && !RUN_AT.includes(cs.runAt)) {
      errors.push('content_scripts[' + i + '].runAt 非法')
    }
  }
  return errors
}

/** 生成 manifest.json（校验失败抛中文错） */
export function buildManifestV3(input: ManifestV3Input): string {
  const errors = validateManifestV3(input)
  if (errors.length > 0) throw new Error(errors.join('；'))
  const manifest: Record<string, unknown> = {
    manifest_version: 3,
    name: input.name.trim(),
    version: input.version,
  }
  if (input.description?.trim()) manifest.description = input.description.trim()
  if (input.permissions.length > 0) manifest.permissions = input.permissions
  if (input.hostPermissions.length > 0) manifest.host_permissions = input.hostPermissions
  if (input.action) {
    const action: Record<string, string> = {}
    if (input.action.defaultTitle) action.default_title = input.action.defaultTitle
    if (input.action.defaultPopup) action.default_popup = input.action.defaultPopup
    if (Object.keys(action).length > 0) manifest.action = action
  }
  if (input.backgroundServiceWorker) {
    manifest.background = { service_worker: input.backgroundServiceWorker }
  }
  if (input.contentScripts && input.contentScripts.length > 0) {
    manifest.content_scripts = input.contentScripts.map((cs) => {
      const o: Record<string, unknown> = { matches: cs.matches, js: cs.js }
      if (cs.css && cs.css.length > 0) o.css = cs.css
      if (cs.runAt) o.run_at = cs.runAt
      return o
    })
  }
  return JSON.stringify(manifest, null, 2)
}

/** 解析组件输入 JSON（含 MV2 遗留字段拦截；非法抛中文错） */
export function parseManifestConfig(json: string): ManifestV3Input {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('配置不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('配置必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  if ('browser_action' in o || 'page_action' in o) {
    throw new Error('检测到 MV2 字段 browser_action/page_action，MV3 请改用 action')
  }
  const bg = o.background as Record<string, unknown> | undefined
  if (bg && typeof bg === 'object' && 'persistent' in bg) {
    throw new Error('检测到 MV2 字段 background.persistent，MV3 请改用 service_worker')
  }
  const actionRaw = o.action as Record<string, unknown> | undefined
  const csRaw = Array.isArray(o.contentScripts)
    ? (o.contentScripts as Record<string, unknown>[])
    : []
  return {
    name: String(o.name ?? ''),
    version: String(o.version ?? ''),
    description: typeof o.description === 'string' ? o.description : undefined,
    permissions: Array.isArray(o.permissions) ? o.permissions.map(String) : [],
    hostPermissions: Array.isArray(o.hostPermissions) ? o.hostPermissions.map(String) : [],
    action:
      actionRaw && typeof actionRaw === 'object'
        ? {
            defaultTitle:
              typeof actionRaw.defaultTitle === 'string' ? actionRaw.defaultTitle : undefined,
            defaultPopup:
              typeof actionRaw.defaultPopup === 'string' ? actionRaw.defaultPopup : undefined,
          }
        : undefined,
    backgroundServiceWorker:
      typeof o.backgroundServiceWorker === 'string' ? o.backgroundServiceWorker : undefined,
    contentScripts: csRaw.map((cs) => ({
      matches: Array.isArray(cs.matches) ? cs.matches.map(String) : [],
      js: Array.isArray(cs.js) ? cs.js.map(String) : [],
      css: Array.isArray(cs.css) ? cs.css.map(String) : undefined,
      runAt: cs.runAt as ContentScriptDef['runAt'],
    })),
  }
}

/** 示例配置 */
export const EXAMPLE_CONFIG = {
  name: '我的扩展',
  version: '1.0.0',
  description: '示例浏览器扩展',
  permissions: ['storage', 'activeTab'],
  hostPermissions: ['https://api.example.com/*'],
  action: { defaultTitle: '打开', defaultPopup: 'popup.html' },
  backgroundServiceWorker: 'background.js',
  contentScripts: [{ matches: ['https://example.com/*'], js: ['content.js'] }],
}
