/**
 * 工具注册表 —— 由 scripts/generate-catalog.ts 自动生成，请勿手工编辑。
 * 生成时间：2026-09-24T04:11:01.319Z
 * 工具数：5
 */
import type { ToolMeta } from './types'

export const TOOLS: readonly ToolMeta[] = [
  {
    id: 'cookie-parse',
    slug: 'cookie-parse',
    title: 'Cookie 解析',
    description: 'Cookie / Set-Cookie 串与对象互转，支持属性标志位',
    titleEn: 'Cookie Parser',
    descriptionEn: 'Convert Cookie and Set-Cookie strings to objects and back, with flag attributes',
    category: 'data-format',
    group: 'dev',
    tags: ['cookie', 'parse', 'header'],
    priority: 'P0',
    feasibility: 'A',
    template: 'T2',
    inputs: ['text'],
    outputs: ['text'],
    options: ['mode', 'sortKeys'],
    deps: [],
    worker: false,
    wasm: false,
    api: false,
  },
  {
    id: 'json-formatter',
    slug: 'json-formatter',
    title: 'JSON 格式化',
    description: '格式化、压缩、校验 JSON，支持树形查看',
    titleEn: 'JSON Formatter',
    descriptionEn: 'Format, minify and validate JSON, with a tree view',
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
  {
    id: 'json-minify',
    slug: 'json-minify',
    title: 'JSON 压缩',
    description: '去除 JSON 中的空白与换行，压成单行以减小体积',
    titleEn: 'JSON Minify',
    descriptionEn: 'Strip whitespace and newlines from JSON into a single line',
    category: 'data-format',
    group: 'dev',
    tags: ['json', 'minify', 'compress'],
    priority: 'P0',
    feasibility: 'A',
    template: 'T2',
    inputs: ['text'],
    outputs: ['text'],
    options: ['sortKeys'],
    deps: [],
    worker: false,
    wasm: false,
    api: false,
  },
  {
    id: 'query-string',
    slug: 'query-string',
    title: 'Query String 解析',
    description: '查询串与对象互转，支持重复键与键名排序',
    titleEn: 'Query String',
    descriptionEn: 'Convert query strings to objects and back, with repeated keys and sorting',
    category: 'data-format',
    group: 'dev',
    tags: ['query', 'querystring', 'url'],
    priority: 'P0',
    feasibility: 'A',
    template: 'T2',
    inputs: ['text'],
    outputs: ['text'],
    options: ['mode', 'sortKeys'],
    deps: [],
    worker: false,
    wasm: false,
    api: false,
  },
  {
    id: 'url-parser',
    slug: 'url-parser',
    title: 'URL 解析',
    description: '拆解 URL 的协议、主机、端口、路径、查询参数与锚点',
    titleEn: 'URL Parser',
    descriptionEn: 'Break a URL into protocol, host, port, path, query and fragment',
    category: 'data-format',
    group: 'dev',
    tags: ['url', 'parse', 'query'],
    priority: 'P0',
    feasibility: 'A',
    template: 'T2',
    inputs: ['text'],
    outputs: ['text'],
    options: [],
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
