import type { SankeyInput, SankeyOptions } from './schema'

/** 桑基图节点 */
export interface SankeyNode {
  readonly name: string
}

/** 桑基图连线：源节点 → 目标节点，流量为 value */
export interface SankeyLink {
  readonly source: string
  readonly target: string
  readonly value: number
}

/** 解析后的桑基图数据（节点按首次出现顺序去重） */
export interface ParsedSankey {
  readonly nodes: readonly SankeyNode[]
  readonly links: readonly SankeyLink[]
}

/** 内置示例数据（留空输入时使用） */
export const EXAMPLE_DATA = `访问, 注册, 100
注册, 付费, 30
访问, 流失, 70`

/** 解析标题：留空返回空串（不显示标题） */
export function parseTitle(raw: string): string {
  return raw.trim()
}

/** 解析尺寸：100–2000，留空默认 600（宽）/ 400（高） */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/**
 * 解析桑基图行文本：每行「源, 目标, 数值」（全角逗号自动归一）。
 * 纯函数：不碰 DOM。节点按首次出现顺序去重。
 */
export function parseSankeyData(text: string): ParsedSankey {
  const lines = text
    .replace(/，/g, ',')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  if (lines.length === 0) {
    throw new Error('数据不能为空（每行：源, 目标, 数值）')
  }
  const seen = new Set<string>()
  const nodes: SankeyNode[] = []
  const links: SankeyLink[] = []
  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim())
    if (cols.length !== 3) {
      throw new Error(`数据格式非法：${line}（每行须为 源, 目标, 数值）`)
    }
    const [source, target, vstr] = cols
    if (source === '') {
      throw new Error(`节点名不能为空：${line}`)
    }
    if (target === '') {
      throw new Error(`节点名不能为空：${line}`)
    }
    if (source === target) {
      throw new Error(`源与目标不能相同：${source}（不支持自环）`)
    }
    const value = Number(vstr)
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`数值非法：${vstr}（须为大于 0 的数字）`)
    }
    for (const name of [source, target]) {
      if (!seen.has(name)) {
        seen.add(name)
        nodes.push({ name })
      }
    }
    links.push({ source, target, value })
  }
  return { nodes, links }
}

/** 从解析数据构建 echarts 桑基图 option（纯对象，不依赖 echarts 运行时） */
export function buildSankeyOption(
  parsed: ParsedSankey,
  title: string,
): Record<string, unknown> {
  return {
    title: title === '' ? undefined : { text: title, left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'sankey',
        data: parsed.nodes.map((n) => ({ name: n.name })),
        links: parsed.links.map((l) => ({
          source: l.source,
          target: l.target,
          value: l.value,
        })),
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'source', curveness: 0.5 },
        label: { formatter: '{b}' },
      },
    ],
  }
}

/** T3 toText 入口：返回桑基图数据文本（空输入用示例） */
export function transform(input: SankeyInput, _options: SankeyOptions): string {
  const text = input.text.trim()
  return text === '' ? EXAMPLE_DATA : text
}
