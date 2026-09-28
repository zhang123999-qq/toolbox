/**
 * permission —— 全局编号 #776
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 权限声明：Chrome 扩展常用权限字典（中文说明 + 风险等级），
 * 生成 manifest permissions / host_permissions 片段。
 * 纯数据，无任何运行时依赖。
 */

export type PermissionRisk = 'low' | 'medium' | 'high'

export interface PermissionInfo {
  name: string
  description: string
  risk: PermissionRisk
}

export const RISK_LABELS: Record<PermissionRisk, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

export const PERMISSIONS: readonly PermissionInfo[] = [
  { name: 'activeTab', description: '用户主动调用时临时访问当前标签页', risk: 'low' },
  { name: 'alarms', description: '使用 chrome.alarms 定时任务', risk: 'low' },
  { name: 'bookmarks', description: '读写浏览器书签', risk: 'medium' },
  { name: 'clipboardRead', description: '读取剪贴板内容', risk: 'high' },
  { name: 'clipboardWrite', description: '写入剪贴板', risk: 'low' },
  { name: 'contextMenus', description: '添加浏览器右键菜单项', risk: 'low' },
  { name: 'cookies', description: '读写浏览器 Cookie', risk: 'high' },
  { name: 'debugger', description: '使用调试协议（高危，商店审核严格）', risk: 'high' },
  { name: 'downloads', description: '管理浏览器下载任务', risk: 'medium' },
  { name: 'history', description: '读取浏览器浏览历史', risk: 'high' },
  { name: 'identity', description: 'OAuth 身份验证与获取用户信息', risk: 'high' },
  { name: 'management', description: '管理其他扩展与应用', risk: 'high' },
  { name: 'notifications', description: '显示系统通知', risk: 'low' },
  { name: 'proxy', description: '管理浏览器代理设置', risk: 'high' },
  { name: 'scripting', description: '向页面注入脚本（chrome.scripting）', risk: 'medium' },
  { name: 'storage', description: '读写扩展本地 / 同步存储', risk: 'low' },
  { name: 'tabs', description: '读取标签页标题、URL 与 favicon', risk: 'medium' },
  { name: 'unlimitedStorage', description: '突破扩展存储配额限制', risk: 'medium' },
  { name: 'webNavigation', description: '监听页面导航事件', risk: 'medium' },
  { name: 'webRequest', description: '观察网络请求（只读，不含修改需 webRequestBlocking）', risk: 'medium' },
]

const PERMISSION_MAP = new Map<string, PermissionInfo>(PERMISSIONS.map((p) => [p.name, p]))

/** 返回全部权限条目（拷贝，防外部篡改）。 */
export function listPermissions(): PermissionInfo[] {
  return PERMISSIONS.map((p) => ({ ...p }))
}

/** 解释单个权限，未知权限抛中文错。 */
export function explainPermission(name: string): PermissionInfo {
  const info = PERMISSION_MAP.get(name)
  if (!info) {
    throw new Error(`未知权限：${name}`)
  }
  return info
}

export interface PermissionsManifestInput {
  permissions: string[]
  hostPermissions: string[]
}

/**
 * 生成 manifest 权限片段 JSON。
 * 未知权限抛中文错；hostPermissions 为空时不输出 host_permissions 字段。
 */
export function buildPermissionsManifest(input: PermissionsManifestInput): string {
  const permissions: string[] = []
  for (const name of input.permissions) {
    const info = explainPermission(name)
    if (!permissions.includes(info.name)) {
      permissions.push(info.name)
    }
  }
  const manifest: Record<string, unknown> = { permissions }
  if (input.hostPermissions.length > 0) {
    manifest.host_permissions = [...input.hostPermissions]
  }
  return JSON.stringify(manifest, null, 2)
}

/** 解析页面输入的 JSON（非法抛中文错）。 */
export function parsePermissionsInput(text: string): PermissionsManifestInput {
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
  return {
    permissions: Array.isArray(o.permissions) ? (o.permissions as string[]) : [],
    hostPermissions: Array.isArray(o.hostPermissions) ? (o.hostPermissions as string[]) : [],
  }
}

export const EXAMPLE_PERMISSIONS: PermissionsManifestInput = {
  permissions: ['storage', 'activeTab', 'scripting'],
  hostPermissions: ['https://api.example.com/*'],
}
