/**
 * extension-publish —— 全局编号 #784
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 浏览器扩展发布前检查：
 * PUBLISH_CHECKLIST 为 Chrome Web Store / Edge Add-ons / Firefox Add-ons
 * 的发布前检查项；checkPublishReady 结合 manifest、文件列表与附加信息
 * 逐项评估，输出 [{id, ok, message}]。
 * 纯本地评估，无任何运行时依赖。
 */

export type StoreId = 'chrome' | 'edge' | 'firefox'

export interface PublishCheckItem {
  id: string
  stores: readonly StoreId[]
  label: string
  hint: string
}

export interface PublishInput {
  store: StoreId
  manifestText: string
  files: string[]
  /** 打包 zip 大小（KB），不提供则该项判为未通过并提示补充 */
  zipSizeKb?: number
  /** 是否已准备商店截图 */
  hasScreenshots?: boolean
  /** 是否已准备隐私政策（敏感权限时必填） */
  hasPrivacyPolicy?: boolean
}

export interface PublishCheckResult {
  id: string
  label: string
  ok: boolean
  message: string
}

export const STORE_NAMES: Record<StoreId, string> = {
  chrome: 'Chrome Web Store',
  edge: 'Edge Add-ons',
  firefox: 'Firefox Add-ons',
}

export const PUBLISH_CHECKLIST: readonly PublishCheckItem[] = [
  { id: 'manifest-exists', stores: ['chrome', 'edge', 'firefox'], label: 'manifest.json 存在', hint: '打包 zip 根目录必须包含 manifest.json' },
  { id: 'manifest-valid', stores: ['chrome', 'edge', 'firefox'], label: 'manifest 合法（MV3）', hint: 'manifest_version 为 3 且为合法 JSON' },
  { id: 'meta-complete', stores: ['chrome', 'edge', 'firefox'], label: '名称/版本/描述完整', hint: 'name、version、description 均已填写' },
  { id: 'icons', stores: ['chrome', 'edge', 'firefox'], label: '图标齐全', hint: '至少提供 128px 图标且文件存在' },
  { id: 'zip-size', stores: ['chrome', 'edge', 'firefox'], label: '安装包大小合规', hint: 'Chrome/Edge 上限 128MB，Firefox 上限 200MB' },
  { id: 'screenshots', stores: ['chrome', 'edge', 'firefox'], label: '商店截图已准备', hint: '建议 1280×800 截图至少 1 张' },
  { id: 'privacy-policy', stores: ['chrome', 'edge', 'firefox'], label: '隐私政策（如需）', hint: '声明敏感权限或处理用户数据时必须提供' },
  { id: 'firefox-source', stores: ['firefox'], label: '源码提交（如含混淆代码）', hint: 'Firefox 要求混淆/压缩代码提交可读源码' },
]

const SENSITIVE_PERMISSIONS: readonly string[] = [
  'tabs',
  'history',
  'bookmarks',
  'cookies',
  'webRequest',
  'webNavigation',
  '<all_urls>',
]

const ZIP_LIMIT_KB: Record<StoreId, number> = {
  chrome: 128 * 1024,
  edge: 128 * 1024,
  firefox: 200 * 1024,
}

interface ManifestCtx {
  parsed: boolean
  manifest: Record<string, unknown>
  files: string[]
}

function parseCtx(input: PublishInput): ManifestCtx {
  let parsed = false
  let manifest: Record<string, unknown> = {}
  try {
    const m: unknown = JSON.parse(input.manifestText)
    if (typeof m === 'object' && m !== null) {
      parsed = true
      manifest = m as Record<string, unknown>
    }
  } catch {
    parsed = false
  }
  return { parsed, manifest, files: input.files }
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function evaluateCheck(
  item: PublishCheckItem,
  input: PublishInput,
  ctx: ManifestCtx,
): PublishCheckResult {
  const fail = (message: string): PublishCheckResult => ({ id: item.id, label: item.label, ok: false, message })
  const pass = (message: string): PublishCheckResult => ({ id: item.id, label: item.label, ok: true, message })
  if (item.id === 'manifest-exists') {
    return ctx.files.includes('manifest.json')
      ? pass('manifest.json 在文件列表中')
      : fail('文件列表中缺少 manifest.json')
  }
  if (item.id === 'manifest-valid') {
    if (!ctx.parsed) return fail('manifest.json 不是合法 JSON 对象')
    return ctx.manifest.manifest_version === 3
      ? pass('manifest_version 为 3')
      : fail(`manifest_version 为 ${String(ctx.manifest.manifest_version)}，应为 3`)
  }
  if (item.id === 'meta-complete') {
    if (!ctx.parsed) return fail('manifest 解析失败，无法检查')
    const missing = ['name', 'version', 'description'].filter(
      (k) => typeof ctx.manifest[k] !== 'string' || (ctx.manifest[k] as string).trim() === '',
    )
    return missing.length === 0
      ? pass('name / version / description 完整')
      : fail(`缺少字段：${missing.join('、')}`)
  }
  if (item.id === 'icons') {
    if (!ctx.parsed) return fail('manifest 解析失败，无法检查')
    const icons = ctx.manifest.icons
    if (typeof icons !== 'object' || icons === null) return fail('未声明 icons')
    const icon128 = (icons as Record<string, unknown>)['128']
    if (typeof icon128 !== 'string') return fail('未声明 128px 图标')
    return ctx.files.includes(icon128)
      ? pass('128px 图标文件存在')
      : fail(`图标文件 ${icon128} 不在文件列表中`)
  }
  if (item.id === 'zip-size') {
    if (input.zipSizeKb === undefined) return fail('未提供 zip 大小，请填写打包后的 KB 数')
    const limit = ZIP_LIMIT_KB[input.store]
    return input.zipSizeKb <= limit
      ? pass(`zip 大小 ${input.zipSizeKb} KB，未超 ${STORE_NAMES[input.store]} 上限`)
      : fail(`zip 大小 ${input.zipSizeKb} KB，超过上限 ${limit} KB`)
  }
  if (item.id === 'screenshots') {
    return input.hasScreenshots === true
      ? pass('已确认准备商店截图')
      : fail('尚未准备商店截图（建议 1280×800）')
  }
  if (item.id === 'privacy-policy') {
    if (!ctx.parsed) return fail('manifest 解析失败，无法检查')
    const perms = [...stringArray(ctx.manifest.permissions), ...stringArray(ctx.manifest.host_permissions)]
    const sensitive = perms.filter((p) => SENSITIVE_PERMISSIONS.includes(p))
    if (sensitive.length === 0) return pass('未声明敏感权限，可不提供隐私政策')
    return input.hasPrivacyPolicy === true
      ? pass(`已提供隐私政策（敏感权限：${sensitive.join('、')}）`)
      : fail(`声明了敏感权限（${sensitive.join('、')}），需提供隐私政策`)
  }
  // firefox-source（最后一项兜底即本项，无不可达分支）
  return pass('如代码经过混淆/压缩，请在提交时附上可读源码；未混淆则忽略本项')
}

export function checkPublishReady(input: PublishInput): PublishCheckResult[] {
  const ctx = parseCtx(input)
  return PUBLISH_CHECKLIST.filter((c) => c.stores.includes(input.store)).map((c) =>
    evaluateCheck(c, input, ctx),
  )
}

export function renderPublishResults(store: StoreId, results: PublishCheckResult[]): string {
  const failed = results.filter((r) => !r.ok)
  const head = `${STORE_NAMES[store]} 发布检查：${results.length - failed.length}/${results.length} 通过`
  if (failed.length === 0) return head + '\n全部通过，可以提交审核。'
  return (
    head +
    '\n' +
    failed.map((r, idx) => `${idx + 1}. [未通过] ${r.label}：${r.message}`).join('\n')
  )
}

export function parsePublishInput(text: string): { zipSizeKb?: number; hasScreenshots?: boolean; hasPrivacyPolicy?: boolean } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('输入必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  const out: { zipSizeKb?: number; hasScreenshots?: boolean; hasPrivacyPolicy?: boolean } = {}
  if (o.zipSizeKb !== undefined) {
    if (typeof o.zipSizeKb !== 'number' || o.zipSizeKb < 0) throw new Error('zipSizeKb 必须为非负数字')
    out.zipSizeKb = o.zipSizeKb
  }
  if (o.hasScreenshots !== undefined) {
    if (typeof o.hasScreenshots !== 'boolean') throw new Error('hasScreenshots 必须为布尔值')
    out.hasScreenshots = o.hasScreenshots
  }
  if (o.hasPrivacyPolicy !== undefined) {
    if (typeof o.hasPrivacyPolicy !== 'boolean') throw new Error('hasPrivacyPolicy 必须为布尔值')
    out.hasPrivacyPolicy = o.hasPrivacyPolicy
  }
  return out
}
