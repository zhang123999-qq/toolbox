/**
 * extension-debug —— 全局编号 #783
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 浏览器扩展问题诊断：
 * diagnoseExtension 解析 manifest.json，结合文件列表检查 manifest_version、
 * MV2 残留字段、background 声明、icons 文件存在性、权限宽泛度等，
 * 输出 issues[{level, message, fix}]。
 * 纯字符串/对象处理，无任何运行时依赖。
 */

export type DebugIssueLevel = 'error' | 'warning' | 'info'

export interface DebugIssue {
  level: DebugIssueLevel
  message: string
  fix: string
}

const MV2_TOP_LEVEL_FIELDS: ReadonlyArray<{ field: string; fix: string }> = [
  { field: 'browser_action', fix: '改用 MV3 的 action 字段' },
  { field: 'page_action', fix: '改用 MV3 的 action 字段' },
]

const BROAD_HOST_PATTERNS: readonly string[] = ['<all_urls>', '*://*/*', 'http://*/*', 'https://*/*']

function invalidManifest(message: string, fix: string): DebugIssue[] {
  return [{ level: 'error', message, fix }]
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function diagnoseExtension(manifestText: string, files: string[]): DebugIssue[] {
  let m: unknown
  try {
    m = JSON.parse(manifestText)
  } catch {
    return invalidManifest('manifest.json 不是合法 JSON', '先用 JSON 校验工具修复语法错误')
  }
  if (typeof m !== 'object' || m === null || Array.isArray(m)) {
    return invalidManifest('manifest.json 根节点必须是对象', '将根节点改为 { ... } 对象')
  }
  const o = m as Record<string, unknown>
  const issues: DebugIssue[] = []

  if (o.manifest_version !== 3) {
    issues.push({
      level: 'error',
      message: `manifest_version 为 ${String(o.manifest_version)}，Manifest V3 要求为 3`,
      fix: '将 manifest_version 改为 3，并按 MV3 迁移 API',
    })
  }

  for (const { field, fix } of MV2_TOP_LEVEL_FIELDS) {
    if (field in o) {
      issues.push({ level: 'error', message: `残留 MV2 顶层字段 ${field}`, fix })
    }
  }
  if (typeof o.content_security_policy === 'string') {
    issues.push({
      level: 'error',
      message: 'content_security_policy 为字符串形式（MV2 写法）',
      fix: '改为 MV3 对象形式：{ "extension_pages": "script-src \'self\'; ..." }',
    })
  }

  const bg = o.background
  if (typeof bg === 'object' && bg !== null) {
    const b = bg as Record<string, unknown>
    if ('scripts' in b) {
      issues.push({
        level: 'error',
        message: 'background.scripts 为 MV2 写法',
        fix: '改用 background.service_worker 指定单个 Service Worker 文件',
      })
    }
    if (b.persistent === true) {
      issues.push({
        level: 'error',
        message: 'background.persistent 在 MV3 中不被支持',
        fix: '删除 persistent，Service Worker 为事件驱动、按需唤醒',
      })
    }
    if (typeof b.service_worker === 'string') {
      if (!files.includes(b.service_worker)) {
        issues.push({
          level: 'warning',
          message: `service_worker 文件 ${b.service_worker} 不在文件列表中`,
          fix: '确认 service_worker 路径拼写，或补充该文件',
        })
      }
    } else if (!('scripts' in b)) {
      issues.push({
        level: 'warning',
        message: 'background 未声明 service_worker',
        fix: '在 background 中声明 "service_worker": "background.js"',
      })
    }
  } else {
    issues.push({
      level: 'info',
      message: '未声明 background，后台逻辑将无法运行',
      fix: '如需后台逻辑，添加 background.service_worker 声明',
    })
  }

  const icons = o.icons
  if (typeof icons === 'object' && icons !== null) {
    for (const [size, path] of Object.entries(icons as Record<string, unknown>)) {
      if (typeof path !== 'string' || !files.includes(path)) {
        issues.push({
          level: 'warning',
          message: `图标 ${size}px（${String(path)}）在文件列表中缺失`,
          fix: '补充图标文件，或修正 icons 中的路径',
        })
      }
    }
  } else {
    issues.push({
      level: 'info',
      message: '未声明 icons，建议提供 16 / 48 / 128 三档图标',
      fix: '在 manifest.json 顶层添加 icons 字段',
    })
  }

  const permissions = asStringArray(o.permissions)
  const hostPermissions = asStringArray(o.host_permissions)
  const broad = hostPermissions.filter((h) => BROAD_HOST_PATTERNS.includes(h))
  if (broad.length > 0) {
    issues.push({
      level: 'warning',
      message: `host_permissions 过于宽泛：${broad.join('、')}`,
      fix: '收窄到实际需要的域名，如 https://api.example.com/*',
    })
  }
  if (permissions.length > 5) {
    issues.push({
      level: 'info',
      message: `声明了 ${permissions.length} 个权限，建议按最小权限原则复核`,
      fix: '移除未实际使用的权限，减少审核与用户疑虑',
    })
  }
  if (typeof o.name !== 'string' || o.name.trim() === '') {
    issues.push({ level: 'error', message: '缺少扩展名称 name', fix: '在 manifest.json 顶层添加 name 字段' })
  }
  if (typeof o.version !== 'string' || o.version.trim() === '') {
    issues.push({ level: 'error', message: '缺少版本号 version', fix: '在 manifest.json 顶层添加 version 字段' })
  }

  return issues
}

/** 将诊断结果渲染为可读文本 */
export function renderDebugIssues(issues: DebugIssue[]): string {
  if (issues.length === 0) {
    return '未发现问题：manifest 结构符合 Manifest V3 基本要求。'
  }
  const levelLabel: Record<DebugIssueLevel, string> = { error: '错误', warning: '警告', info: '提示' }
  return (
    `发现 ${issues.length} 个问题：\n` +
    issues
      .map((i, idx) => `${idx + 1}. [${levelLabel[i.level]}] ${i.message}\n   修复：${i.fix}`)
      .join('\n')
  )
}
