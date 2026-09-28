/**
 * pwa-manifest —— PWA manifest.json 生成的纯函数层（#629）
 *
 * 纯 JS：表单字段组装成 manifest 对象，JSON.stringify（缩进 2 格）输出。
 * name / short_name 必填缺失抛中文错；theme_color / background_color 须为
 * #hex 格式；icons 多行文本每行「图标路径 尺寸」（如 icon-192.png 192x192）。
 * 输出前做 JSON 回环校验。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** manifest 表单字段：name 取主输入，其余走选项 */
export interface ManifestFields {
  readonly name: string
  readonly shortName?: string
  readonly startUrl?: string
  readonly display?: string
  readonly themeColor?: string
  readonly backgroundColor?: string
  /** 多行文本，每行「图标路径 尺寸」，如：icon-192.png 192x192 */
  readonly icons?: string
}

export interface ManifestIcon {
  readonly src: string
  readonly sizes: string
  readonly type: string
}

/** 去首尾空格，未传视为空字符串 */
function field(value: string | undefined): string {
  return (value ?? '').trim()
}

/** #hex 颜色：#rgb 或 #rrggbb */
export function isHexColor(raw: string): boolean {
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(raw.trim())
}

/** 图标尺寸格式：192x192 */
function isIconSize(raw: string): boolean {
  return /^\d+x\d+$/.test(raw)
}

/** 由文件后缀推断 MIME */
function mimeOf(src: string): string {
  const lower = src.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/png'
}

/**
 * 解析 icons 多行文本：每行「图标路径 尺寸」。
 * 空行跳过；格式错误抛中文错（带行号）。
 */
export function parseIconLines(text: string | undefined): ManifestIcon[] {
  const icons: ManifestIcon[] = []
  const lines = (text ?? '').split('\n')
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t === '') return
    const parts = t.split(/\s+/)
    if (parts.length !== 2 || parts[0] === '' || !isIconSize(parts[1])) {
      throw new Error(`第 ${i + 1} 行格式错误，应为「图标路径 尺寸」，如 icon-192.png 192x192`)
    }
    icons.push({ src: parts[0], sizes: parts[1], type: mimeOf(parts[0]) })
  })
  return icons
}

/**
 * 由表单字段生成 manifest.json 内容。
 * name / short_name 必填；颜色格式错误抛中文错；输出前 JSON 回环校验。
 */
export function buildManifestJson(f: ManifestFields): string {
  const name = field(f.name)
  if (name === '') throw new Error('name（应用名称）不能为空')
  const shortName = field(f.shortName)
  if (shortName === '') throw new Error('short_name（短名称）不能为空')

  const themeColor = field(f.themeColor)
  if (themeColor !== '' && !isHexColor(themeColor)) {
    throw new Error('theme_color 格式错误，应为 #hex 颜色，如 #2563eb')
  }
  const backgroundColor = field(f.backgroundColor)
  if (backgroundColor !== '' && !isHexColor(backgroundColor)) {
    throw new Error('background_color 格式错误，应为 #hex 颜色，如 #ffffff')
  }

  const manifest: Record<string, unknown> = { name, short_name: shortName }
  const put = (key: string, value: string | undefined) => {
    const v = field(value)
    if (v !== '') manifest[key] = v
  }
  put('start_url', f.startUrl)
  const display = field(f.display) === '' ? 'standalone' : field(f.display)
  manifest.display = display
  if (themeColor !== '') manifest.theme_color = themeColor
  if (backgroundColor !== '') manifest.background_color = backgroundColor
  const icons = parseIconLines(f.icons)
  if (icons.length > 0) manifest.icons = icons

  const json = JSON.stringify(manifest, null, 2)
  // 回环校验：保证输出是合法 JSON
  JSON.parse(json)
  return json + '\n'
}
