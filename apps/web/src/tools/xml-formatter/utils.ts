import type { XmlFormatterInput, XmlFormatterOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class XmlFormatterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'XmlFormatterError'
  }
}

/** 与 schema 的 max 保持一致：超过这个长度直接放弃，避免主线程长时间阻塞 */
const MAX_INPUT = 2_000_000

export interface XmlAttr {
  readonly name: string
  readonly value: string
}

export type XmlNode =
  | {
      readonly kind: 'element'
      readonly name: string
      readonly attrs: readonly XmlAttr[]
      readonly children: readonly XmlNode[]
    }
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'cdata'; readonly value: string }
  | { readonly kind: 'comment'; readonly value: string }
  | { readonly kind: 'pi'; readonly target: string; readonly value: string }
  | { readonly kind: 'doctype'; readonly value: string }

/**
 * 浏览器 / jsdom 里才有 DOMParser，node 里没有；且各家实现的报错既没有行列号、
 * 严格程度也不一致（例如未声明的命名空间前缀），因此 DOMParser 只当「额外的一道
 * 严格校验」使用，结构解析与输出一律走自研解析器，保证两个环境结果一致。
 */
export function hasNativeParser(): boolean {
  return typeof DOMParser !== 'undefined'
}

/** 用原生 DOMParser 做一次良构校验；无 DOMParser 时视为通过 */
export function nativeWellFormed(text: string): boolean {
  if (!hasNativeParser()) return true
  try {
    const doc = new DOMParser().parseFromString(text, 'text/xml')
    // jsdom / 浏览器把解析错误塞进文档里的 <parsererror>，不抛异常
    return doc.getElementsByTagName('parsererror').length === 0
  } catch {
    return false
  }
}

/**
 * 把字符下标换算成「第 N 行第 M 列」，让报错能直接定位到源码位置。
 * 行列从 1 开始，与编辑器状态栏一致。
 */
export function locate(source: string, index: number): string {
  const before = source.slice(0, Math.max(0, Math.min(index, source.length)))
  const line = before.split('\n').length
  const lastBreak = before.lastIndexOf('\n')
  return `第 ${line} 行第 ${before.length - lastBreak} 列`
}

/** 纯文本里的 XML 特殊字符 */
export function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 属性值：除尖括号与 & 外，引号和换行也必须转义，否则会破坏引号配对 */
export function escapeAttr(value: string): string {
  return escapeText(value)
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
    .replace(/\t/g, '&#9;')
}

/** 递归下降解析器：只认 XML 1.0 的良构子集，任何不合法都抛带位置的中文错误 */
class XmlParser {
  private pos = 0

  constructor(private readonly src: string) {}

  /** 解析整份文档；XML 必须有且只有一个根元素 */
  parseDocument(): readonly XmlNode[] {
    const nodes: XmlNode[] = []
    let rootSeen = false
    while (!this.eof()) {
      const node = this.parseNode()
      if (!node) continue
      if (node.kind === 'element') {
        if (rootSeen) throw this.fail(this.pos, '出现第二个根元素，XML 只能有一个根元素')
        rootSeen = true
      }
      nodes.push(node)
    }
    if (!rootSeen) throw this.fail(this.pos, '缺少根元素')
    return nodes
  }

  private parseNode(): XmlNode | null {
    if (this.peek() !== '<') return { kind: 'text', value: this.readText() }
    if (this.startsWith('<!--')) return this.readComment()
    if (this.startsWith('<![CDATA[')) return this.readCdata()
    if (this.startsWith('<!')) return this.readDoctype()
    if (this.startsWith('<?')) return this.readPi()
    if (this.startsWith('</')) {
      throw this.fail(this.pos, '出现多余的闭合标签，XML 的标签必须成对出现')
    }
    return this.parseElement()
  }

  private parseElement(): XmlNode {
    const openPos = this.pos
    this.pos += 1
    const name = this.readName()
    if (name === '') throw this.fail(openPos, '标签名为空，< 后面必须紧跟标签名')
    const attrs: XmlAttr[] = []
    for (;;) {
      this.skipSpace()
      if (this.startsWith('/>')) {
        this.pos += 2
        return { kind: 'element', name, attrs, children: [] }
      }
      if (this.startsWith('>')) {
        this.pos += 1
        break
      }
      const attrPos = this.pos
      const attrName = this.readName()
      if (attrName === '') throw this.fail(attrPos, `标签 <${name}> 里的属性名不合法`)
      if (attrs.some((attr) => attr.name === attrName)) {
        throw this.fail(attrPos, `标签 <${name}> 里属性 ${attrName} 重复`)
      }
      this.skipSpace()
      if (this.peek() !== '=') {
        throw this.fail(this.pos, `属性 ${attrName} 缺少值，XML 属性必须写成 name="value"`)
      }
      this.pos += 1
      this.skipSpace()
      const quote = this.peek()
      if (quote !== '"' && quote !== "'") {
        throw this.fail(this.pos, `属性 ${attrName} 的值必须用引号包裹`)
      }
      this.pos += 1
      const end = this.src.indexOf(quote, this.pos)
      if (end < 0) throw this.fail(this.pos, `属性 ${attrName} 的引号没有闭合`)
      const raw = this.src.slice(this.pos, end)
      attrs.push({ name: attrName, value: this.decode(raw, this.pos) })
      this.pos = end + 1
    }
    return { kind: 'element', name, attrs, children: this.parseChildren(name, openPos) }
  }

  /** 读到与 name 配对的闭合标签为止；EOF 与不匹配都要能定位到开始标签 */
  private parseChildren(name: string, openPos: number): readonly XmlNode[] {
    const children: XmlNode[] = []
    for (;;) {
      if (this.eof()) throw this.fail(openPos, `标签 <${name}> 没有闭合`)
      if (this.startsWith('</')) {
        const closePos = this.pos
        this.pos += 2
        const closeName = this.readName()
        this.skipSpace()
        if (this.peek() !== '>') throw this.fail(this.pos, `闭合标签 </${closeName}> 写法不合法`)
        this.pos += 1
        if (closeName !== name) {
          throw this.fail(closePos, `闭合标签 </${closeName}> 与开始标签 <${name}> 不匹配`)
        }
        return children
      }
      const node = this.parseNode()
      if (node) children.push(node)
    }
  }

  private readComment(): XmlNode {
    const start = this.pos
    const end = this.src.indexOf('-->', this.pos + 4)
    if (end < 0) throw this.fail(start, '注释 <!-- 没有闭合，缺少 -->')
    const value = this.src.slice(start + 4, end)
    this.pos = end + 3
    return { kind: 'comment', value }
  }

  private readCdata(): XmlNode {
    const start = this.pos
    const end = this.src.indexOf(']]>', this.pos + 9)
    if (end < 0) throw this.fail(start, 'CDATA 段没有闭合，缺少 ]]>')
    const value = this.src.slice(start + 9, end)
    this.pos = end + 3
    return { kind: 'cdata', value }
  }

  /** DOCTYPE 可能带内部子集 `[...]`，所以要按括号深度找结束的 > */
  private readDoctype(): XmlNode {
    const start = this.pos
    let depth = 0
    let i = start + 2
    for (; i < this.src.length; i += 1) {
      const char = this.src[i]
      if (char === '[') depth += 1
      else if (char === ']') depth -= 1
      else if (char === '>' && depth === 0) break
    }
    if (i >= this.src.length) throw this.fail(start, '声明 <!DOCTYPE 没有闭合，缺少 >')
    const value = this.src.slice(start + 2, i)
    this.pos = i + 1
    if (!/^DOCTYPE/i.test(value)) throw this.fail(start, '只支持 <!DOCTYPE ...> 形式的声明')
    return { kind: 'doctype', value }
  }

  private readPi(): XmlNode {
    const start = this.pos
    this.pos += 2
    const target = this.readName()
    if (target === '') throw this.fail(start, '处理指令 <? 缺少目标名')
    const end = this.src.indexOf('?>', this.pos)
    if (end < 0) throw this.fail(start, `处理指令 <?${target} 没有闭合，缺少 ?>`)
    const value = this.src.slice(this.pos, end).trim()
    this.pos = end + 2
    return { kind: 'pi', target, value }
  }

  private readText(): string {
    const start = this.pos
    const next = this.src.indexOf('<', this.pos)
    const end = next < 0 ? this.src.length : next
    const raw = this.src.slice(start, end)
    this.pos = end
    return this.decode(raw, start)
  }

  /** 只解 XML 预定义的 5 个实体与数字字符引用，其它一律视为非法 */
  private decode(text: string, base: number): string {
    if (text.indexOf('&') < 0) return text
    let out = ''
    let i = 0
    while (i < text.length) {
      const amp = text.indexOf('&', i)
      if (amp < 0) {
        out += text.slice(i)
        break
      }
      out += text.slice(i, amp)
      const semi = text.indexOf(';', amp)
      if (semi < 0) throw this.fail(base + amp, '实体引用缺少分号')
      const body = text.slice(amp + 1, semi)
      const decoded = decodeEntity(body)
      if (decoded === null) throw this.fail(base + amp, `实体引用 &${body}; 无法识别`)
      out += decoded
      i = semi + 1
    }
    return out
  }

  private readName(): string {
    const start = this.pos
    while (!this.eof()) {
      const char = this.src[this.pos]
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') break
      if (char === '/' || char === '>' || char === '=' || char === '<' || char === '?') break
      this.pos += 1
    }
    return this.src.slice(start, this.pos)
  }

  private skipSpace(): void {
    while (!this.eof() && /\s/.test(this.src[this.pos])) this.pos += 1
  }

  private peek(): string {
    return this.eof() ? '' : this.src[this.pos]
  }

  private startsWith(token: string): boolean {
    return this.src.startsWith(token, this.pos)
  }

  private eof(): boolean {
    return this.pos >= this.src.length
  }

  private fail(index: number, message: string): XmlFormatterError {
    return new XmlFormatterError(`${message}（${locate(this.src, index)}）`)
  }
}

/** 单个实体 → 字符；不认识返回 null */
function decodeEntity(body: string): string | null {
  const named: Record<string, string> = {
    lt: '<',
    gt: '>',
    amp: '&',
    quot: '"',
    apos: "'",
  }
  if (body in named) return named[body]
  if (body.startsWith('#x') || body.startsWith('#X')) {
    return codePointToString(Number.parseInt(body.slice(2), 16), body)
  }
  if (body.startsWith('#')) return codePointToString(Number.parseInt(body.slice(1), 10), body)
  return null
}

function codePointToString(code: number, body: string): string | null {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return null
  if (body.length === 0) return null
  return String.fromCodePoint(code)
}

/** 解析入口：先自研解析拿结构与位置，再用原生解析器补一道严格校验 */
export function parseXml(text: string): readonly XmlNode[] {
  const nodes = new XmlParser(text).parseDocument()
  if (!nativeWellFormed(text)) {
    throw new XmlFormatterError(
      'XML 不合法：浏览器内置解析器校验未通过（可能含未声明的命名空间前缀或非法字符）',
    )
  }
  return nodes
}

const INDENT_UNIT: Record<string, string> = { '2': '  ', '4': '    ', tab: '\t' }

/** 纯空白文本节点：格式化时一律丢弃（缩进本来就是排版噪音） */
function isBlank(node: XmlNode): boolean {
  return node.kind === 'text' && node.value.trim() === ''
}

function attrsToString(attrs: readonly XmlAttr[]): string {
  return attrs.map((attr) => ` ${attr.name}="${escapeAttr(attr.value)}"`).join('')
}

/** 非元素节点一律原样输出，它们不会引入层级，可直接内联 */
function renderInline(node: XmlNode): string {
  switch (node.kind) {
    case 'text':
      return escapeText(node.value)
    case 'cdata':
      return `<![CDATA[${node.value}]]>`
    case 'comment':
      return `<!--${node.value}-->`
    case 'pi':
      return node.value === '' ? `<?${node.target}?>` : `<?${node.target} ${node.value}?>`
    case 'doctype':
      return `<!${node.value}>`
    case 'element':
      return ''
  }
}

function formatNode(node: XmlNode, depth: number, unit: string): string {
  const pad = unit.repeat(depth)
  switch (node.kind) {
    case 'element': {
      const open = `<${node.name}${attrsToString(node.attrs)}`
      const children = node.children.filter((child) => !isBlank(child))
      if (children.length === 0) return `${open}/>`
      // 只有一个文本 / CDATA 子节点时保持单行，避免把 <a>1</a> 拆成三行
      if (children.length === 1 && children[0].kind !== 'element') {
        return `${open}>${renderInline(children[0])}</${node.name}>`
      }
      const inner = children
        .map((child) => pad + unit + formatNode(child, depth + 1, unit))
        .join('\n')
      return `${open}>\n${inner}\n${pad}</${node.name}>`
    }
    default:
      return renderInline(node)
  }
}

function minifyNode(node: XmlNode): string {
  switch (node.kind) {
    case 'element': {
      const open = `<${node.name}${attrsToString(node.attrs)}`
      const children = node.children.filter((child) => !isBlank(child))
      if (children.length === 0) return `${open}/>`
      return `${open}>${children.map(minifyNode).join('')}</${node.name}>`
    }
    default:
      return renderInline(node)
  }
}

/**
 * 格式化 / 压缩 XML —— 纯函数，不依赖 React / DOM，可独立单测。
 * minify 只删除标签之间的缩进空白，不改动文本内容。
 */
export function transform(input: XmlFormatterInput, options: XmlFormatterOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new XmlFormatterError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }

  const nodes = parseXml(input.text)
  if (options.mode === 'minify') return nodes.map(minifyNode).join('')
  const unit = INDENT_UNIT[options.indent] ?? '  '
  return nodes.map((node) => formatNode(node, 0, unit)).join('\n')
}
