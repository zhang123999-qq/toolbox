/**
 * 本文件只放纯函数：文件校验、HTML→Markdown 转换等。
 * mammoth 的动态加载与转换编排在 Tool.tsx（重型库不进 utils）。
 */

/** 单文件上限：50 MiB */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

/** 字节数转人类可读：1536 → "1.50 KiB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}

/** 校验上传的文件：扩展名 / 空文件 / 体积；不合法抛中文错误 */
export function assertDocxFile(file: { readonly name: string; readonly size: number }): void {
  if (!/\.docx$/i.test(file.name)) {
    throw new Error(`请选择 .docx 文件（当前文件：${file.name === '' ? '未知' : file.name}）`)
  }
  if (file.size === 0) throw new Error('文件为空，请选择有效的 .docx 文件')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限`)
  }
}

/** 切出精确的 ArrayBuffer：subarray 的结果 byteOffset 未必为 0 */
export function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** 去掉 <img …> 标签：Markdown 输出里不嵌入图片 */
export function stripImageTags(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, '')
}

// ---------------------------------------------------------------------------
// HTML → Markdown（纯函数，不依赖 mammoth，可独立测试）
// ---------------------------------------------------------------------------

/** 行内节点 → Markdown：文本节点压缩空白，元素节点按标签映射 */
function inlineNode(node: Node): string {
  if (node.nodeType === 3) return (node as Text).data.replace(/\s+/g, ' ')
  if (node.nodeType !== 1) return ''
  const el = node as HTMLElement
  const inner = Array.from(el.childNodes).map(inlineNode).join('')
  switch (el.tagName.toLowerCase()) {
    case 'strong':
    case 'b':
      return `**${inner}**`
    case 'em':
    case 'i':
      return `*${inner}*`
    case 'code':
      return `\`${inner}\``
    case 's':
    case 'del':
    case 'strike':
      return `~~${inner}~~`
    case 'a': {
      const href = el.getAttribute('href')
      return href ? `[${inner}](${href})` : inner
    }
    case 'br':
      return '\n'
    case 'img':
      return ''
    default:
      return inner
  }
}

/** 子元素行内文本（块级容器取其行内内容时用） */
function inlineChildren(el: HTMLElement): string {
  return Array.from(el.childNodes).map(inlineNode).join('')
}

/** 每行前加两个空格：嵌套列表的缩进 */
function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
}

/** <ul>/<ol> → Markdown 列表；li 内的嵌套列表缩进两格 */
function listToMarkdown(list: HTMLElement, ordered: boolean): string {
  const items = Array.from(list.children).filter(
    (child): child is HTMLElement => child.nodeType === 1 && child.tagName.toLowerCase() === 'li',
  )
  return items
    .map((li, index) => {
      const marker = ordered ? `${index + 1}.` : '-'
      const chunks: string[] = []
      let head = ''
      for (const child of Array.from(li.childNodes)) {
        if (
          child.nodeType === 1 &&
          ['ul', 'ol'].includes((child as HTMLElement).tagName.toLowerCase())
        ) {
          chunks.push(indent(blockNode(child)))
        } else {
          head += inlineNode(child)
        }
      }
      const first = `${marker} ${head.trim()}`.trimEnd()
      return [first, ...chunks].join('\n')
    })
    .join('\n')
}

/** 表格单元格转义：管道符与换行会破坏 Markdown 表格 */
function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, '<br/>')
}

/** <table> → Markdown 表格：首行为表头；无行则返回空串 */
function tableToMarkdown(table: HTMLElement): string {
  const rowEls: HTMLElement[] = []
  for (const section of Array.from(table.childNodes)) {
    if (section.nodeType !== 1) continue
    const tag = (section as HTMLElement).tagName.toLowerCase()
    // 注：HTML 解析器会自动为裸 <tr> 补 <tbody>，故此处只处理三种行分组
    if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
      for (const tr of Array.from(section.childNodes)) {
        if (tr.nodeType === 1 && (tr as HTMLElement).tagName.toLowerCase() === 'tr') {
          rowEls.push(tr as HTMLElement)
        }
      }
    }
  }
  if (rowEls.length === 0) return ''
  const rows = rowEls.map((tr) =>
    Array.from(tr.children)
      .filter(
        (cell): cell is HTMLElement =>
          cell.nodeType === 1 && ['td', 'th'].includes(cell.tagName.toLowerCase()),
      )
      .map((cell) => escapeCell(inlineChildren(cell).trim())),
  )
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (cells: string[]): string[] => cells.concat(Array(width - cells.length).fill(''))
  const lines = rows.map((r) => `| ${pad(r).join(' | ')} |`)
  lines.splice(1, 0, `| ${Array(width).fill('---').join(' | ')} |`)
  return lines.join('\n')
}

/** 块级节点 → Markdown（不带块间空行，由调用方拼接） */
function blockNode(node: Node): string {
  if (node.nodeType === 3) return (node as Text).data.replace(/\s+/g, ' ').trim()
  if (node.nodeType !== 1) return ''
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${inlineChildren(el).trim()}`
  switch (tag) {
    case 'p':
    case 'div':
      return inlineChildren(el).trim()
    case 'ul':
      return listToMarkdown(el, false)
    case 'ol':
      return listToMarkdown(el, true)
    case 'table':
      return tableToMarkdown(el)
    case 'pre':
      return '```\n' + String(el.textContent) + '\n```'
    case 'blockquote': {
      const inner = Array.from(el.childNodes)
        .map(blockNode)
        .filter((s) => s !== '')
        .join('\n\n')
      return inner
        .split('\n')
        .map((line) => `> ${line}`.trimEnd())
        .join('\n')
    }
    case 'hr':
      return '---'
    default:
      return Array.from(el.childNodes)
        .map(blockNode)
        .filter((s) => s !== '')
        .join('\n\n')
  }
}

/**
 * HTML 片段 → Markdown 文本。
 * 覆盖 mammoth 产出的标签全集：h1-h6 / p / strong / em / ul / ol / a / table / pre / br。
 */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = Array.from(doc.body.childNodes)
    .map(blockNode)
    .filter((s) => s !== '')
  if (blocks.length === 0) return ''
  return blocks.join('\n\n') + '\n'
}

/** 转换结果非空校验：去图片后正文为空时抛中文错误 */
export function assertNonEmptyMarkdown(markdown: string): void {
  if (markdown === '') throw new Error('文档中没有可转换的内容')
}
