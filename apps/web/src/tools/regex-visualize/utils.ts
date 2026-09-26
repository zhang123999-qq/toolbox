import type { RegexVisualizeInput, RegexVisualizeOptions } from './schema'

// ---------------------------------------------------------------------------
// 正则语法树（自研子集解析器：字面量 / 字符类 / 锚点 / 分组 / 选择 / 连接 / 量词）
// ---------------------------------------------------------------------------

type AstNode =
  | { t: 'empty' }
  | { t: 'atom'; kind: 'literal' | 'class' | 'anchor'; label: string }
  | { t: 'group'; child: AstNode; name?: string }
  | { t: 'seq'; children: AstNode[] }
  | { t: 'alt'; branches: AstNode[][] }
  | { t: 'quant'; child: AstNode; min: number; max: number | 'inf' }

class Parser {
  private readonly s: string
  private i = 0

  constructor(s: string) {
    this.s = s
  }

  private peek(): string | undefined {
    return this.s[this.i]
  }

  private next(): string | undefined {
    return this.s[this.i++]
  }

  parseTop(): AstNode {
    const root = this.parseAlt()
    if (this.i < this.s.length) {
      throw new Error('正则解析失败：意外字符 "' + this.peek() + '"')
    }
    return root
  }

  private parseAlt(): AstNode {
    const seqs: AstNode[][] = [this.parseSeq()]
    while (this.peek() === '|') {
      this.next()
      seqs.push(this.parseSeq())
    }
    if (seqs.length === 1) {
      const seq = seqs[0]
      if (seq.length === 0) return { t: 'empty' }
      if (seq.length === 1) return seq[0]
      return { t: 'seq', children: seq }
    }
    return { t: 'alt', branches: seqs }
  }

  private parseSeq(): AstNode[] {
    const out: AstNode[] = []
    while (this.i < this.s.length && this.peek() !== '|' && this.peek() !== ')') {
      let atom = this.parseBase()
      atom = this.parseQuant(atom)
      out.push(atom)
    }
    return out
  }

  private parseBase(): AstNode {
    const c = this.peek()
    if (c === undefined) return { t: 'empty' }
    if (c === '^' || c === '$') {
      this.next()
      return { t: 'atom', kind: 'anchor', label: c }
    }
    if (c === '(') {
      this.next()
      let name: string | undefined
      if (this.peek() === '?') {
        this.next()
        if (this.peek() === ':') {
          this.next()
        } else if (this.peek() === '<') {
          this.next()
          const m = /^([A-Za-z_]\w*)/.exec(this.s.slice(this.i))
          if (!m) throw new Error('命名分组缺少名字')
          name = m[1]
          this.i += m[0].length
          if (this.peek() !== '>') throw new Error('命名分组缺少 >')
          this.next()
        } else {
          throw new Error('不支持的分组开头: ?' + this.peek())
        }
      }
      const child = this.parseAlt()
      if (this.next() !== ')') throw new Error('缺少右括号 )')
      return { t: 'group', child, name }
    }
    if (c === '[') {
      this.next()
      let cls = '['
      while (this.i < this.s.length && this.peek() !== ']') {
        if (this.peek() === '\\') cls += this.next() ?? ''
        cls += this.next() ?? ''
      }
      if (this.next() !== ']') throw new Error('缺少字符类右括号 ]')
      cls += ']'
      return { t: 'atom', kind: 'class', label: cls }
    }
    if (c === '\\') {
      this.next()
      const e = this.next()
      if (e === undefined) throw new Error('反斜杠后缺少字符')
      if ('dDwWsSbB'.includes(e)) return { t: 'atom', kind: 'class', label: '\\' + e }
      return { t: 'atom', kind: 'literal', label: '\\' + e }
    }
    this.next()
    return { t: 'atom', kind: 'literal', label: c }
  }

  private parseQuant(atom: AstNode): AstNode {
    const c = this.peek()
    if (c === '?' || c === '*' || c === '+') {
      this.next()
      const map: Record<string, [number, number | 'inf']> = {
        '?': [0, 1],
        '*': [0, 'inf'],
        '+': [1, 'inf'],
      }
      const [min, max] = map[c]
      return { t: 'quant', child: atom, min, max }
    }
    if (c === '{') {
      const m = /^\{(\d+)(?:(,)(\d*))?\}/.exec(this.s.slice(this.i))
      if (m) {
        this.i += m[0].length
        const min = parseInt(m[1], 10)
        const max: number | 'inf' = m[2] === ',' ? (m[3] ? parseInt(m[3], 10) : 'inf') : min
        return { t: 'quant', child: atom, min, max }
      }
    }
    return atom
  }
}

// ---------------------------------------------------------------------------
// SVG 铁路图布局（自底向上：每个节点返回 svg 片段 + 宽高，轨道在垂直中线）
// ---------------------------------------------------------------------------

const BOX_H = 36
const CHAR_W = 9
const PAD_X = 16
const HSTUB = 18
const GAP = 14
const VGAP = 12
const LOOP_H = 36

interface Rendered {
  readonly svg: string
  readonly w: number
  readonly h: number
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderBox(label: string, fill: string): Rendered {
  const w = Math.max(52, label.length * CHAR_W + PAD_X * 2)
  const text = esc(label)
  const svg =
    `<rect x="0" y="0" width="${w}" height="${BOX_H}" rx="7" fill="${fill}" stroke="#475569" stroke-width="1.5"/>` +
    `<text x="${w / 2}" y="${BOX_H / 2 + 4}" text-anchor="middle" font-size="13" fill="#0f172a">${text}</text>`
  return { svg, w, h: BOX_H }
}

function renderSeq(children: AstNode[]): Rendered {
  if (children.length === 0) return { svg: '', w: HSTUB * 2, h: BOX_H }
  const rs = children.map(renderNode)
  const h = Math.max(...rs.map((r) => r.h))
  const parts: string[] = []
  let x = HSTUB
  rs.forEach((r, i) => {
    const yOff = (h - r.h) / 2
    parts.push(`<g transform="translate(${x},${yOff})">${r.svg}</g>`)
    if (i < rs.length - 1) {
      parts.push(
        `<line x1="${x + r.w}" y1="${h / 2}" x2="${x + r.w + GAP}" y2="${h / 2}" stroke="#475569" stroke-width="2"/>`,
      )
      x += r.w + GAP
    } else {
      x += r.w
    }
  })
  x += HSTUB
  return { svg: parts.join(''), w: x, h }
}

function renderAlt(branches: AstNode[][]): Rendered {
  const rs = branches.map((b) =>
    b.length === 1 ? renderNode(b[0]) : renderNode({ t: 'seq', children: b }),
  )
  const maxW = Math.max(...rs.map((r) => r.w), 1)
  const railYs: number[] = []
  let h = 0
  rs.forEach((r, i) => {
    railYs.push(h + r.h / 2)
    h += r.h + (i < rs.length - 1 ? VGAP : 0)
  })
  const busX = HSTUB
  const rightX = busX + maxW
  const midY = h / 2
  const parts: string[] = []
  const top = railYs[0]
  const bottom = railYs[railYs.length - 1]
  parts.push(
    `<line x1="${busX}" y1="${top}" x2="${busX}" y2="${bottom}" stroke="#475569" stroke-width="2"/>`,
  )
  parts.push(
    `<line x1="0" y1="${midY}" x2="${busX}" y2="${midY}" stroke="#475569" stroke-width="2"/>`,
  )
  parts.push(
    `<line x1="${rightX}" y1="${top}" x2="${rightX}" y2="${bottom}" stroke="#475569" stroke-width="2"/>`,
  )
  parts.push(
    `<line x1="${rightX}" y1="${midY}" x2="${rightX + HSTUB}" y2="${midY}" stroke="#475569" stroke-width="2"/>`,
  )
  let y = 0
  rs.forEach((r, i) => {
    parts.push(`<g transform="translate(${busX},${y})">${r.svg}</g>`)
    parts.push(
      `<line x1="${busX + r.w}" y1="${railYs[i]}" x2="${rightX}" y2="${railYs[i]}" stroke="#475569" stroke-width="2"/>`,
    )
    y += r.h + VGAP
  })
  return { svg: parts.join(''), w: rightX + HSTUB, h }
}

function quantLabel(min: number, max: number | 'inf'): string {
  if (max === 'inf') return min === 0 ? '*' : '+'
  if (min === 0 && max === 1) return '?'
  if (min === max) return `{${min}}`
  return `{${min},${max}}`
}

function renderQuant(child: AstNode, min: number, max: number | 'inf'): Rendered {
  const r = renderNode(child)
  const w = r.w + HSTUB * 2
  const h = r.h + LOOP_H
  const railY = LOOP_H + r.h / 2
  const parts: string[] = []
  parts.push(`<g transform="translate(${HSTUB},${LOOP_H})">${r.svg}</g>`)
  parts.push(
    `<line x1="0" y1="${railY}" x2="${HSTUB}" y2="${railY}" stroke="#475569" stroke-width="2"/>`,
  )
  parts.push(
    `<line x1="${HSTUB + r.w}" y1="${railY}" x2="${w}" y2="${railY}" stroke="#475569" stroke-width="2"/>`,
  )
  const loopTop = LOOP_H / 2
  // 回环（重复）：从出口上行、左行、下行回到入口
  parts.push(
    `<path d="M ${HSTUB + r.w} ${railY} V ${loopTop} H ${HSTUB} V ${railY}" fill="none" stroke="#2563eb" stroke-width="2"/>`,
  )
  parts.push(
    `<text x="${HSTUB + r.w / 2}" y="${loopTop - 4}" text-anchor="middle" font-size="12" fill="#2563eb">${quantLabel(min, max)}</text>`,
  )
  return { svg: parts.join(''), w, h }
}

function renderNode(n: AstNode): Rendered {
  switch (n.t) {
    case 'empty':
      return { svg: '', w: HSTUB * 2, h: BOX_H }
    case 'atom': {
      const fill = n.kind === 'class' ? '#fde68a' : n.kind === 'anchor' ? '#c7d2fe' : '#ffffff'
      return renderBox(n.label, fill)
    }
    case 'group':
      return renderNode(n.child)
    case 'seq':
      return renderSeq(n.children)
    case 'alt':
      return renderAlt(n.branches)
    case 'quant':
      return renderQuant(n.child, n.min, n.max)
  }
}

/** 把正则编译成 SVG 字符串 */
export function visualize(pattern: string): string {
  const root = new Parser(pattern).parseTop()
  const r = renderNode(root)
  const padL = 64
  const padT = 20
  const width = r.w + padL + 40
  const height = r.h + padT * 2
  const midY = padT + r.h / 2
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="monospace">`,
  )
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`)
  // 起点 / 终点胶囊
  parts.push(
    `<rect x="8" y="${midY - 14}" width="36" height="28" rx="14" fill="#22c55e"/><text x="26" y="${midY + 4}" text-anchor="middle" font-size="13" fill="#ffffff">start</text>`,
  )
  parts.push(
    `<rect x="${width - 44}" y="${midY - 14}" width="36" height="28" rx="14" fill="#ef4444"/><text x="${width - 26}" y="${midY + 4}" text-anchor="middle" font-size="13" fill="#ffffff">end</text>`,
  )
  parts.push(
    `<line x1="44" y1="${midY}" x2="${padL}" y2="${midY}" stroke="#475569" stroke-width="2"/>`,
  )
  parts.push(`<g transform="translate(${padL},${padT})">${r.svg}</g>`)
  parts.push(
    `<line x1="${padL + r.w}" y1="${midY}" x2="${width - 44}" y2="${midY}" stroke="#475569" stroke-width="2"/>`,
  )
  parts.push('</svg>')
  return parts.join('\n')
}

/** 主转换：空输入返回空串；非法正则抛中文错误 */
export function transform(input: RegexVisualizeInput, _options: RegexVisualizeOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  try {
    return visualize(input.text)
  } catch (error) {
    if (error instanceof Error && /^正则解析失败|缺少|不支持/.test(error.message)) throw error
    throw new Error('正则解析失败：' + (error instanceof Error ? error.message : String(error)), {
      cause: error,
    })
  }
}
