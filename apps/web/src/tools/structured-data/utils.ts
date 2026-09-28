import type { StructuredDataInput, StructuredDataOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class StructuredDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StructuredDataError'
  }
}

export interface JsonLdBlock {
  readonly index: number
  readonly ok: boolean
  readonly type: string
  readonly context: string
  readonly note: string
  readonly error: string | null
}

/** 提取 HTML 中所有 <script type="application/ld+json"> 的内容（去空） */
export function extractJsonLd(html: string): string[] {
  const out: string[] = []
  const re = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi
  for (const m of html.matchAll(re)) {
    const content = m[1].trim()
    if (content !== '') out.push(content)
  }
  return out
}

/** 把 JSON.parse 的报错转成中文位置提示（位置信息尽力而为） */
export function jsonErrorHint(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  const m = /at position (\d+)/.exec(msg) ?? /line (\d+) column (\d+)/.exec(msg)
  if (!m) return `JSON 解析失败：${msg}`
  if (m[2] !== undefined) return `JSON 解析失败：${msg}（约第 ${m[1]} 行第 ${m[2]} 列附近）`
  return `JSON 解析失败：${msg}（约第 ${m[1]} 个字符附近）`
}

/** 校验单块 JSON-LD 文本 */
export function validateJsonLd(text: string): Omit<JsonLdBlock, 'index'> {
  const fail = (error: string): Omit<JsonLdBlock, 'index'> => ({
    ok: false,
    type: '（未知）',
    context: '（未知）',
    note: '',
    error,
  })
  if (text.trim() === '') return fail('JSON-LD 内容为空')
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch (error) {
    return fail(jsonErrorHint(error))
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return fail('JSON-LD 顶层必须是对象（包含 @context / @type）')
  }
  const rec = obj as Record<string, unknown>
  const hasType = typeof rec['@type'] === 'string' && rec['@type'] !== ''
  const hasContext = typeof rec['@context'] === 'string' && rec['@context'] !== ''
  const missing: string[] = []
  if (!hasContext) missing.push('@context')
  if (!hasType) missing.push('@type')
  return {
    ok: true,
    type: hasType ? (rec['@type'] as string) : '（缺失 @type）',
    context: hasContext ? (rec['@context'] as string) : '（缺失 @context）',
    note: missing.length > 0 ? `缺少 ${missing.join('、')}，搜索引擎可能无法识别，建议补全` : '',
    error: null,
  }
}

/** 按来源产出待校验块（含序号） */
export function analyzeStructuredData(
  input: string,
  source: '网页 HTML' | 'JSON-LD 文本',
): JsonLdBlock[] {
  const texts = source === '网页 HTML' ? extractJsonLd(input) : [input]
  return texts.map((t, i) => ({ index: i + 1, ...validateJsonLd(t) }))
}

/** 渲染校验报告为文本 */
export function renderReport(blocks: readonly JsonLdBlock[], source: string): string {
  const lines: string[] = []
  lines.push(`来源：${source}`)
  if (blocks.length === 0) {
    lines.push('未找到 <script type="application/ld+json"> 结构化数据块')
    return lines.join('\n')
  }
  const passed = blocks.filter((b) => b.ok).length
  lines.push(`共 ${blocks.length} 块 JSON-LD：${passed} 通过 / ${blocks.length - passed} 失败`)
  lines.push('')
  for (const b of blocks) {
    lines.push(`[#${b.index}] ${b.ok ? '通过' : '失败'}`)
    if (b.ok) {
      lines.push(`  @type：${b.type}`)
      lines.push(`  @context：${b.context}`)
      if (b.note !== '') lines.push(`  备注：${b.note}`)
    } else {
      lines.push(`  错误：${b.error}`)
    }
  }
  return lines.join('\n')
}

export function transform(input: StructuredDataInput, options: StructuredDataOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 500000) throw new StructuredDataError('输入超过 500,000 字符上限')
  const blocks = analyzeStructuredData(input.text, options.source)
  return renderReport(blocks, options.source === '网页 HTML' ? '网页 HTML' : '粘贴的 JSON-LD 文本')
}
