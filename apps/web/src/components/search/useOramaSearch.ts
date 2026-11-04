import { useEffect, useRef, useState } from 'react'
import { searchTools } from '@toolbox/search'
import type { SearchDoc } from '@toolbox/search'

/**
 * 主线程调用搜索 Worker 的 Hook（防抖 + 降级）：
 * - 浏览器支持 Worker 时：查询经 120ms 防抖后发给 Worker（预建索引检索，
 *   主线程不再做 800+ 条全量扫描，避免按键卡顿）；
 * - Worker 不可用（SSR / jsdom 测试 / 旧浏览器）：回落同步 searchTools，
 *   行为与旧实现一致。
 */
export function useOramaSearch(query: string, limit = 50): readonly SearchDoc[] {
  const [results, setResults] = useState<readonly SearchDoc[]>([])
  const workerRef = useRef<Worker | null>(null)
  const seqRef = useRef(0)

  const canUseWorker = typeof Worker !== 'undefined' && typeof URL !== 'undefined'

  useEffect(() => {
    if (!canUseWorker) {
      setResults(searchTools(query, limit))
      return
    }
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(new URL('./search.worker.ts', import.meta.url), {
          type: 'module',
        })
      } catch {
        workerRef.current = null
      }
    }
    const worker = workerRef.current
    if (!worker) {
      setResults(searchTools(query, limit))
      return
    }

    const seq = ++seqRef.current
    const timer = window.setTimeout(() => {
      const onMessage = (event: MessageEvent<{ id: number; results: readonly SearchDoc[] }>) => {
        if (event.data.id === seq) setResults(event.data.results)
      }
      worker.addEventListener('message', onMessage)
      worker.postMessage({ id: seq, query, limit })
      window.setTimeout(() => worker.removeEventListener('message', onMessage), 5000)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [query, limit, canUseWorker])

  useEffect(
    () => () => {
      workerRef.current?.terminate()
      workerRef.current = null
    },
    [],
  )

  return results
}
