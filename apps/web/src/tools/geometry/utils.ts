import type { GeometryInput, GeometryOptions } from './schema'
import { SHAPE_LABELS } from './schema'

/** 各图形需要的参数（按顺序） */
const SHAPE_PARAMS: Record<GeometryOptions['shape'], readonly string[]> = {
  square: ['a'],
  rectangle: ['a', 'b'],
  triangle: ['a', 'b', 'c'],
  circle: ['r'],
  cube: ['a'],
  sphere: ['r'],
  cylinder: ['r', 'h'],
  cone: ['r', 'h'],
}

/** 参数别名：中文名 / 英文名都映射到标准键 */
const ALIASES: Record<string, string> = {
  a: 'a',
  边长: 'a',
  长: 'a',
  side: 'a',
  b: 'b',
  宽: 'b',
  width: 'b',
  c: 'c',
  r: 'r',
  半径: 'r',
  radius: 'r',
  h: 'h',
  高: 'h',
  height: 'h',
}

const PARAM_NAMES: Record<string, string> = {
  a: '边长 a',
  b: '宽 b',
  c: '边 c',
  r: '半径 r',
  h: '高 h',
}

/** 有效数字 10 位，去尾零 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  if (n === 0) return '0'
  const s = Number(n.toPrecision(10)).toString()
  return s
}

/** 解析参数：支持「key=value」与裸数字（按顺序填充）两种写法 */
export function parseParams(text: string, shape: GeometryOptions['shape']): Record<string, number> {
  const want = SHAPE_PARAMS[shape]
  const got: Record<string, number> = {}
  const positional: number[] = []
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length === 0) throw new Error('请输入参数')
  for (const line of lines) {
    const eq = line.indexOf('=')
    if (eq >= 0) {
      const keyRaw = line.slice(0, eq).trim().toLowerCase()
      const key = ALIASES[keyRaw]
      if (!key) throw new Error('未知参数名：' + line.slice(0, eq).trim())
      got[key] = parseValue(line.slice(eq + 1), line)
    } else {
      positional.push(parseValue(line, line))
    }
  }
  for (const key of want) {
    if (got[key] === undefined) {
      const next = positional.shift()
      if (next === undefined) {
        throw new Error(
          `缺少参数「${PARAM_NAMES[key]}」：请按 ${want.map((k) => PARAM_NAMES[k]).join('、')} 提供`,
        )
      }
      got[key] = next
    }
  }
  return got
}

function parseValue(raw: string, line: string): number {
  const t = raw.trim()
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
    throw new Error('参数不是数字：' + line)
  }
  const n = Number(t)
  if (!Number.isFinite(n)) throw new Error('参数不是有限数字：' + line)
  if (n <= 0) throw new Error('参数必须为正数：' + line)
  return n
}

type Result = { label: string; value: string; formula: string }

/** 各图形的计算：返回 [结果行..., 公式行] */
function compute(shape: GeometryOptions['shape'], p: Record<string, number>): Result[] {
  switch (shape) {
    case 'square': {
      const { a } = p
      return [
        { label: '周长', value: fmt(4 * a), formula: '4a' },
        { label: '面积', value: fmt(a * a), formula: 'a²' },
      ]
    }
    case 'rectangle': {
      const { a, b } = p
      return [
        { label: '周长', value: fmt(2 * (a + b)), formula: '2(a+b)' },
        { label: '面积', value: fmt(a * b), formula: 'ab' },
        { label: '对角线', value: fmt(Math.hypot(a, b)), formula: '√(a²+b²)' },
      ]
    }
    case 'triangle': {
      const { a, b, c } = p
      if (a + b <= c || a + c <= b || b + c <= a) {
        throw new Error('三边不满足三角形不等式，无法构成三角形')
      }
      const s = (a + b + c) / 2
      return [
        { label: '周长', value: fmt(2 * s), formula: 'a+b+c' },
        {
          label: '面积',
          value: fmt(Math.sqrt(s * (s - a) * (s - b) * (s - c))),
          formula: '√[s(s−a)(s−b)(s−c)]，s=(a+b+c)/2',
        },
      ]
    }
    case 'circle': {
      const { r } = p
      return [
        { label: '直径', value: fmt(2 * r), formula: '2r' },
        { label: '周长', value: fmt(2 * Math.PI * r), formula: '2πr' },
        { label: '面积', value: fmt(Math.PI * r * r), formula: 'πr²' },
      ]
    }
    case 'cube': {
      const { a } = p
      return [
        { label: '表面积', value: fmt(6 * a * a), formula: '6a²' },
        { label: '体积', value: fmt(a * a * a), formula: 'a³' },
      ]
    }
    case 'sphere': {
      const { r } = p
      return [
        { label: '表面积', value: fmt(4 * Math.PI * r * r), formula: '4πr²' },
        { label: '体积', value: fmt((4 / 3) * Math.PI * r * r * r), formula: '4/3·πr³' },
      ]
    }
    case 'cylinder': {
      const { r, h } = p
      return [
        { label: '表面积', value: fmt(2 * Math.PI * r * (r + h)), formula: '2πr(r+h)' },
        { label: '体积', value: fmt(Math.PI * r * r * h), formula: 'πr²h' },
      ]
    }
    case 'cone': {
      const { r, h } = p
      const l = Math.hypot(r, h)
      return [
        { label: '母线', value: fmt(l), formula: '√(r²+h²)' },
        { label: '表面积', value: fmt(Math.PI * r * (r + l)), formula: 'πr(r+l)' },
        { label: '体积', value: fmt((Math.PI * r * r * h) / 3), formula: '1/3·πr²h' },
      ]
    }
  }
}

/** T3 同步入口（也是复制 / 下载用的纯文本） */
export function transform(input: GeometryInput, options: GeometryOptions): string {
  const pText = input.text.trim()
  if (pText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const shape = options.shape
  const params = parseParams(input.text, shape)
  const results = compute(shape, params)
  const want = SHAPE_PARAMS[shape]

  const lines = [
    `图形：${SHAPE_LABELS[shape]}`,
    `参数：${want.map((k) => `${PARAM_NAMES[k]}=${fmt(params[k])}`).join('，')}`,
    ...results.map((r) => `${r.label}：${r.value}`),
    '',
    '公式：',
    ...results.map((r) => `${r.label} = ${r.formula}`),
  ]
  return lines.join('\n')
}
