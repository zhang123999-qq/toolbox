/**
 * 搜索索引与检索
 *
 * 阶段 0 采用轻量实现（子串 + 标签匹配）。
 * 文档定稿为 Orama（docs/spec/02 §1），但 Orama 默认分词器对中文需额外配置
 * （@orama/tokenizers/mandarin），文档未规定分词方案 —— 见交付说明「取舍依据」。
 * 本文件保持 searchTools 签名稳定，后续替换为 Orama 不影响调用方。
 */
import type { CategoryId } from './types'
import { TOOLS } from './tools.generated'

export interface SearchDoc {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly category: CategoryId
  readonly description: string
  readonly tags: readonly string[]
}

/** 索引只含检索所需字段，控制体积（预算 < 50KB gzip） */
export const SEARCH_INDEX: readonly SearchDoc[] = TOOLS.map((t) => ({
  id: t.id,
  title: t.title,
  slug: t.slug,
  category: t.category,
  description: t.description,
  tags: t.tags,
}))

const normalize = (s: string): string => s.toLowerCase().trim()

function score(doc: SearchDoc, q: string): number {
  const title = normalize(doc.title)
  const slug = normalize(doc.slug)
  const desc = normalize(doc.description)
  if (title === q) return 100
  if (title.startsWith(q)) return 80
  if (title.includes(q)) return 60
  if (slug.includes(q)) return 40
  if (doc.tags.some((t) => normalize(t).includes(q))) return 30
  if (desc.includes(q)) return 10
  return 0
}

/**
 * 返回结果上限。
 *
 * 不能太小：站内总共 190 个工具，像 "json" 这样的常见子串会有 20+ 个标题命中，
 * 它们得分相同（title.includes=60）。早期 20 条上限会把排在 catalog 后部的同类
 * 工具（如 big-json）直接截断，导致搜索永远进不去——这是真实可复现的可达性缺陷。
 * 弹窗结果区本就可滚动，190 工具规模下放宽到 50 既能保证任何常见子串的命中都
 * 完整呈现，又不至于一次性渲染全量索引。次级排序再按 slug 升序保证同分顺序确定。
 */
const DEFAULT_LIMIT = 50

/** 空查询返回空数组，避免首页渲染全量列表 */
export function searchTools(query: string, limit = DEFAULT_LIMIT): readonly SearchDoc[] {
  const q = normalize(query)
  if (!q) return []
  return SEARCH_INDEX.map((doc) => ({ doc, s: score(doc, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.doc.slug < b.doc.slug ? -1 : a.doc.slug > b.doc.slug ? 1 : 0))
    .slice(0, limit)
    .map((x) => x.doc)
}
