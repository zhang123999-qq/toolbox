/**
 * 工具注册表 —— 由 scripts/generate-catalog.ts 自动生成，请勿手工编辑。
 * 生成时间：2026-09-23T12:25:37.423Z
 * 工具数：1
 */
import type { ToolMeta } from './types'

export const TOOLS: readonly ToolMeta[] = [
  {
    id: 'json-formatter',
    slug: 'json-formatter',
    title: 'JSON 格式化',
    description: '格式化、压缩、校验 JSON，支持树形查看',
    category: 'data-format',
    group: 'dev',
    tags: ['json', 'format', 'validate'],
    priority: 'P0',
    feasibility: 'A',
    template: 'T2',
    inputs: ['text'],
    outputs: ['text'],
    options: ['indent', 'sortKeys'],
    deps: [],
    worker: false,
    wasm: false,
    api: false,
  },
]

const TOOL_MAP: ReadonlyMap<string, ToolMeta> = new Map(TOOLS.map((t) => [t.id, t]))

export function getTool(id: string): ToolMeta | undefined {
  return TOOL_MAP.get(id)
}

export function toolsOfCategory(category: string): readonly ToolMeta[] {
  return TOOLS.filter((t) => t.category === category)
}

export const TOOL_COUNT = TOOLS.length
