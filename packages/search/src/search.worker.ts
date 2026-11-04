/**
 * 搜索 Web Worker：在 Worker 线程内加载预建索引并执行检索，
 * 主线程只负责发查询、收结果（见 apps/web 的 useOramaSearch.ts）。
 *
 * 协议：
 *   入：  { id: number, query: string, limit?: number }
 *   出：  { id: number, results: SearchDoc[] }
 * 索引来源：优先 fetch('/search-index.json')（构建期预建，见
 * scripts/build-search-index.ts）；拿不到时回落到打包进 Worker 的
 * SEARCH_INDEX，保证离线/非根路径部署仍可搜。
 */
import { SEARCH_INDEX, searchIndex } from './index'
import type { SearchDoc } from './index'

interface SearchRequest {
  readonly id: number
  readonly query: string
  readonly limit?: number
}

interface SearchResponse {
  readonly id: number
  readonly results: readonly SearchDoc[]
}

let indexPromise: Promise<readonly SearchDoc[]> | null = null

function loadIndex(): Promise<readonly SearchDoc[]> {
  if (!indexPromise) {
    indexPromise = (async () => {
      try {
        const res = await fetch('/search-index.json')
        if (res.ok) {
          const data = (await res.json()) as readonly SearchDoc[]
          if (Array.isArray(data) && data.length > 0) return data
        }
      } catch {
        /* 回落到内置索引 */
      }
      return SEARCH_INDEX
    })()
  }
  return indexPromise
}

self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const { id, query, limit } = event.data
  void loadIndex().then((index) => {
    const response: SearchResponse = { id, results: searchIndex(index, query, limit ?? 50) }
    self.postMessage(response)
  })
}
