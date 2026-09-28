import type { GraphInput } from './schema'

/** 内置示例节点（主输入留空时使用） */
export const EXAMPLE_NODES = `张三:朋友
李四:朋友
王五:同事
赵六`

/** 内置示例边（边输入留空时使用） */
export const EXAMPLE_EDGES = `张三 -> 李四:5
李四 -> 王五:2
张三 -> 王五`

/** 图节点：name=节点名，category=类目编号（按类目首次出现顺序） */
export interface GraphNode {
  readonly name: string
  readonly category: number
}

/** 图边：source/target=节点名，value=权重（默认 1） */
export interface GraphLink {
  readonly source: string
  readonly target: string
  readonly value: number
}

/** 图类目：按首次出现顺序排列 */
export interface GraphCategory {
  readonly name: string
}

/** 图解析结果 */
export interface ParsedGraph {
  readonly nodes: readonly GraphNode[]
  readonly links: readonly GraphLink[]
  readonly categories: readonly GraphCategory[]
}

/** 全角冒号归一为半角（节点行、边行共用） */
function normalizeColon(raw: string): string {
  return raw.replace(/：/g, ':')
}

/** 按行切分、trim、过滤空行 */
function splitLines(text: string): string[] {
  return normalizeColon(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
}

/**
 * 解析节点行 + 边行。
 * 纯函数：不碰 DOM，错误以中文 Error 抛出。
 */
export function parseGraphData(nodeText: string, edgeText: string): ParsedGraph {
  const nodeLines = splitLines(nodeText)
  if (nodeLines.length === 0) {
    throw new Error('节点不能为空（每行：节点名 或 节点名:类目）')
  }

  const nodes: GraphNode[] = []
  const seen = new Set<string>()
  const categoryIndex = new Map<string, number>()
  const categories: GraphCategory[] = []
  for (const line of nodeLines) {
    const idx = line.indexOf(':')
    const name = (idx >= 0 ? line.slice(0, idx) : line).trim()
    if (name === '') {
      throw new Error(`节点名不能为空：${line}`)
    }
    if (seen.has(name)) {
      throw new Error(`节点名重复：${name}`)
    }
    seen.add(name)
    let categoryName = '未分类'
    if (idx >= 0) {
      const catRaw = line.slice(idx + 1).trim()
      categoryName = catRaw === '' ? '未分类' : catRaw
    }
    let category = categoryIndex.get(categoryName)
    if (category === undefined) {
      category = categories.length
      categoryIndex.set(categoryName, category)
      categories.push({ name: categoryName })
    }
    nodes.push({ name, category })
  }
  const nodeNames = new Set(nodes.map((n) => n.name))

  const links: GraphLink[] = []
  const edgeLines = splitLines(edgeText)
  for (const line of edgeLines) {
    const parts = line.split('->')
    if (parts.length !== 2) {
      throw new Error(`边格式非法：${line}（应为 源 -> 目标 或 源 -> 目标:权重）`)
    }
    const source = parts[0].trim()
    let rest = parts[1].trim()
    let value = 1
    const widx = rest.lastIndexOf(':')
    if (widx >= 0) {
      const wstr = rest.slice(widx + 1).trim()
      rest = rest.slice(0, widx).trim()
      const w = Number(wstr)
      if (wstr === '' || !Number.isFinite(w) || w <= 0) {
        throw new Error(`边权重非法：${wstr}（须为大于 0 的数字）`)
      }
      value = w
    }
    const target = rest
    if (source === '' || target === '') {
      throw new Error(`边端点不能为空：${line}（源与目标都须非空）`)
    }
    if (!nodeNames.has(source)) {
      throw new Error(`边引用了未定义的节点：${source}`)
    }
    if (!nodeNames.has(target)) {
      throw new Error(`边引用了未定义的节点：${target}`)
    }
    if (source === target) {
      throw new Error(`不支持自环边：${source}`)
    }
    links.push({ source, target, value })
  }

  return { nodes, links, categories }
}

/** 从解析结果构建 echarts force-graph option（纯对象，不依赖 echarts 运行时） */
export function buildGraphOption(parsed: ParsedGraph, title: string): Record<string, unknown> {
  // 先算度：出现越多的节点画得越大
  const degree = new Map<string, number>()
  for (const link of parsed.links) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1)
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1)
  }
  const data = parsed.nodes.map((n) => ({
    name: n.name,
    category: n.category,
    symbolSize: 24 + Math.min(degree.get(n.name) ?? 0, 5) * 6,
    draggable: true,
  }))
  const links = parsed.links.map((l) => ({ source: l.source, target: l.target, value: l.value }))
  return {
    ...(title ? { title: { text: title, left: 'center' } } : {}),
    tooltip: {},
    legend: { data: parsed.categories.map((c) => c.name) },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        data,
        links,
        categories: parsed.categories.map((c) => ({ name: c.name })),
        force: { repulsion: 120, edgeLength: 80 },
        label: { show: true },
        edgeSymbol: ['none', 'arrow'],
        emphasis: { focus: 'adjacency' },
      },
    ],
  }
}

/** 解析尺寸：100–2000，留空默认宽 600 / 高 400 */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/** 解析标题：留空返回空串（不显示标题） */
export function parseTitle(raw: string): string {
  return raw.trim()
}

/** T3 toText 入口：返回节点数据文本（主输入留空用示例） */
export function transform(input: GraphInput): string {
  const text = input.text.trim()
  return text === '' ? EXAMPLE_NODES : text
}

/** 边文本入口：边输入留空用示例边 */
export function resolveEdgeText(raw: string): string {
  const text = raw.trim()
  return text === '' ? EXAMPLE_EDGES : raw
}
