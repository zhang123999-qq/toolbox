/**
 * 搜索能力门面（packages/search）
 *
 * 架构：预建索引 + Web Worker 检索（见 search.worker.ts / useOramaSearch.ts）。
 * - 构建期由 scripts/build-search-index.ts 把 SEARCH_INDEX 序列化为
 *   apps/web/public/search-index.json（预建索引，随静态产物发布）；
 * - Worker 内加载预建索引执行打分检索，主线程不再做全量扫描；
 * - 本文件导出的 searchIndex 是纯函数，Worker 与单测共用同一套打分口径，
 *   与 @toolbox/catalog 的 searchTools 结果保持一致（同分按 slug 升序）。
 *
 * Orama 接入位：后续把 searchIndex 换成 @orama/orama 的 restore()+search()
 * 即可，Worker 协议（{id, query, limit} → {id, results}）无需变化。
 */
import { SEARCH_INDEX, searchTools } from '@toolbox/catalog'
import type { SearchDoc } from '@toolbox/catalog'

export { searchTools, SEARCH_INDEX }
export type { SearchDoc }

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

/** 纯函数版检索：对任意预建索引做打分排序（Worker 内使用） */
export function searchIndex(
  index: readonly SearchDoc[],
  query: string,
  limit = 50,
): readonly SearchDoc[] {
  const q = normalize(query)
  if (!q) return []
  return index
    .map((doc) => ({ doc, s: score(doc, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.doc.slug < b.doc.slug ? -1 : a.doc.slug > b.doc.slug ? 1 : 0))
    .slice(0, limit)
    .map((x) => x.doc)
}
