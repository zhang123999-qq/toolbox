import type { XmlToJsonInput, XmlToJsonOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class XmlToJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'XmlToJsonError'
  }
}

/** 与 schema 的 max 保持一致 */
const MAX_INPUT = 2_000_000

interface XmlAttr {
  readonly name: string
  readonly value: string
}

interface XmlElement {
  readonly name: string
  readonly attrs: readonly XmlAttr[]
  /** 只保留文本与子元素；注释 / 处理指令 / DOCTYPE 在转换时无意义，解析阶段即丢弃 */
  readonly children: readonly XmlChild[]
}

type XmlChild =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'cdata'; readonly value: string }
  | { readonly kind: 'element'; readonly value: XmlElement }

/**
 * 递归下降解析：只取转换需要的元素 / 属性 / 文本 / CDATA。
 * 与 xml-formatter 一样刻意不使用 DOMParser——单测在 node 跑、组件测试在 jsdom 跑，
 * 原生解析器两侧行为不一致（且 node 根本没有），会破坏结果一致性。
 */
class XmlParser {
  private pos = 0

  constructor(private readonly src: string) {}

  /** 解析出根元素；XML 声明、注释、DOCTYPE 一律跳过 */
  parseRoot(): XmlElement {
    let root: XmlElement | null = null
    while (!this.eof()) {
      const at = this.pos
      if (this.peek() !== '<') {
        throw this.fail(at, '顶层出现文本，XML 必须且只能有一个根元素')
      }
      if (this.startsWith('<!--')) {
        this.skipUntil('-->', at, '注释')
        continue
      }
      if (this.startsWith('<![CDATA[')) {
        throw this.fail(at, 'CDATA 不能出现在顶层')
      }
      if (this.startsWith('<!')) {
        this.skipDoctype(at)
        continue
      }
      if (this.startsWith('<?')) {
        this.skipPi(at)
        continue
      }
      if (this.startsWith('</')) throw this.fail(at, '出现多余的闭合标签')
      const element = this.parseElement()
      if (root) throw this.fail(at, '出现第二个根元素，XML 只能有一个根元素')
      root = element
    }
    if (!root) throw this.fail(this.pos, '缺少根元素')
    return root
  }

  private parseElement(): XmlElement {
    const openPos = this.pos
    this.pos += 1
    const name = this.readName()
    if (name === '') throw this.fail(openPos, '标签名为空，< 后面必须紧跟标签名')
    const attrs: XmlAttr[] = []
    for (;;) {
      this.skipSpace()
      if (this.startsWith('/>')) {
        this.pos += 2
        return { name, attrs, children: [] }
      }
      if (this.startsWith('>')) {
        this.pos += 1
        break
      }
      const attrPos = this.pos
      const attrName = this.readName()
      if (attrName === '') throw this.fail(attrPos, `标签 <${name}> 里的属性名不合法`)
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
      if (end < 0) throw this.fail(attrPos, `属性 ${attrName} 的引号没有闭合`)
      attrs.push({ name: attrName, value: decodeEntities(this.src.slice(this.pos, end)) })
      this.pos = end + 1
    }
    return { name, attrs, children: this.parseChildren(name, openPos) }
  }

  private parseChildren(name: string, openPos: number): readonly XmlChild[] {
    const children: XmlChild[] = []
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
      const child = this.parseChild()
      if (child) children.push(child)
    }
  }

  private parseChild(): XmlChild | null {
    const at = this.pos
    if (this.peek() !== '<') {
      const raw = this.readText()
      // 标签之间的缩进空白不是内容，直接丢弃（CDATA 例外）
      return raw.trim() === '' ? null : { kind: 'text', value: raw.trim() }
    }
    if (this.startsWith('<!--')) {
      this.skipUntil('-->', at, '注释')
      return null
    }
    if (this.startsWith('<![CDATA[')) {
      const end = this.src.indexOf(']]>', this.pos + 9)
      if (end < 0) throw this.fail(at, 'CDATA 段没有闭合，缺少 ]]>')
      const value = this.src.slice(at + 9, end)
      this.pos = end + 3
      return { kind: 'cdata', value }
    }
    if (this.startsWith('<!')) {
      this.skipDoctype(at)
      return null
    }
    if (this.startsWith('<?')) {
      this.skipPi(at)
      return null
    }
    return { kind: 'element', value: this.parseElement() }
  }

  private skipUntil(token: string, at: number, label: string): void {
    const end = this.src.indexOf(token, this.pos + token.length - 1)
    if (end < 0) throw this.fail(at, `${label}没有闭合，缺少 ${token}`)
    this.pos = end + token.length
  }

  /** DOCTYPE 可能带内部子集 `[...]`，按括号深度找结束的 > */
  private skipDoctype(at: number): void {
    let depth = 0
    let i = at + 2
    for (; i < this.src.length; i += 1) {
      const char = this.src[i]
      if (char === '[') depth += 1
      else if (char === ']') depth -= 1
      else if (char === '>' && depth === 0) break
    }
    if (i >= this.src.length) throw this.fail(at, '声明 <!DOCTYPE 没有闭合，缺少 >')
    this.pos = i + 1
  }

  private skipPi(at: number): void {
    const end = this.src.indexOf('?>', at + 2)
    if (end < 0) throw this.fail(at, '处理指令 <? 没有闭合，缺少 ?>')
    this.pos = end + 2
  }

  private readText(): string {
    const start = this.pos
    const next = this.src.indexOf('<', this.pos)
    const end = next < 0 ? this.src.length : next
    const raw = this.src.slice(start, end)
    this.pos = end
    if (raw.indexOf('&') < 0) return raw
    const decoded = decodeEntities(raw)
    // 无法识别的实体说明内容本来就不是合法 XML，交给调用方报错
    if (decoded.includes('&') && /&[a-zA-Z#][^;]*;/.test(decoded)) {
      throw this.fail(start, '存在无法识别的实体引用')
    }
    return decoded
  }

  private readName(): string {
    const start = this.pos
    while (!this.eof()) {
      const char = this.src[this.pos]
      if (/\s/.test(char) || char === '/' || char === '>' || char === '=' || char === '<') break
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

  private fail(index: number, message: string): XmlToJsonError {
    return new XmlToJsonError(`${message}（${locate(this.src, index)}）`)
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
}

/** 解实体；不认识的保持原样，由调用方决定是否报错 */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    }
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
    return NAMED_ENTITIES[body] ?? whole
  })
}

/** 字符下标 → 「第 N 行第 M 列」，与编辑器状态栏一致（从 1 开始） */
export function locate(source: string, index: number): string {
  const before = source.slice(0, Math.max(0, Math.min(index, source.length)))
  const line = before.split('\n').length
  const lastBreak = before.lastIndexOf('\n')
  return `第 ${line} 行第 ${before.length - lastBreak} 列`
}

/**
 * 数组归一策略：同名子元素如何落到 JSON。
 * always 一律数组；auto 只在真的出现多次时才数组；never 不做归一，后者覆盖前者。
 */
export function normalizeList(list: readonly unknown[], mode: string): unknown {
  if (mode === 'always') return [...list]
  if (mode === 'never') return list[list.length - 1]
  return list.length > 1 ? [...list] : list[0]
}

/** 元素 → JSON 值；无属性且无子元素时直接退化成字符串，符合主流 converter 的直觉 */
function convertElement(element: XmlElement, options: XmlToJsonOptions): unknown {
  const texts: string[] = []
  const kids: XmlElement[] = []
  for (const child of element.children) {
    if (child.kind === 'element') kids.push(child.value)
    else texts.push(child.value)
  }
  const text = texts.join('')

  if (element.attrs.length === 0 && kids.length === 0) return text

  const out: Record<string, unknown> = {}
  for (const attr of element.attrs) out[`${options.prefix}${attr.name}`] = attr.value
  if (text !== '') out[options.textKey] = text

  // 按首次出现顺序分组，保证输出键序与文档顺序一致
  const groups = new Map<string, unknown[]>()
  for (const kid of kids) {
    const bucket = groups.get(kid.name) ?? []
    bucket.push(convertElement(kid, options))
    groups.set(kid.name, bucket)
  }
  for (const [name, bucket] of groups) out[name] = normalizeList(bucket, options.mode)
  return out
}

/**
 * XML 转 JSON —— 纯函数，不依赖 React / DOM，可独立单测。
 * 输出以根元素名作为最外层键，与 xml2js 等工具的默认行为一致。
 */
export function transform(input: XmlToJsonInput, options: XmlToJsonOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new XmlToJsonError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }

  const root = new XmlParser(input.text).parseRoot()
  const value = { [root.name]: convertElement(root, options) }
  const indent = Number.parseInt(options.indent, 10)
  return JSON.stringify(value, null, indent)
}
