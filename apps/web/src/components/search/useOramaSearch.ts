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

  // 同步回落路径直接在渲染期计算，避免在 effect 里 setState（lint 禁止）
  const syncResults = canUseWorker ? null : searchTools(query, limit)

  useEffect(() => {
    if (!canUseWorker) return
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
    if (!worker) return

    const seq = ++seqRef.current

    // Worker 脚本加载/运行期出错（如 chunk 404）时回落同步检索，
    // 否则结果永久停留在上一次查询的旧值且无任何提示
    const onError = () => {
      if (seqRef.current === seq) setResults(searchTools(query, limit))
    }
    worker.addEventListener('error', onError)
    let removeTimer: number | undefined
    const onMessage = (event: MessageEvent<{ id: number; results: readonly SearchDoc[] }>) => {
      if (event.data.id === seq) setResults(event.data.results)
    }
    const timer = window.setTimeout(() => {
      worker.addEventListener('message', onMessage)
      worker.postMessage({ id: seq, query, limit })
      removeTimer = window.setTimeout(() => worker.removeEventListener('message', onMessage), 5000)
    }, 120)
    return () => {
      // 清理防抖与「5s 后摘监听」两个定时器外，还要在卸载/查询变更时立即摘监听：
      // 旧实现只靠 5s 定时摘除，卸载后迟到消息仍会调 setResults（卸载后状态更新）
      window.clearTimeout(timer)
      if (removeTimer !== undefined) window.clearTimeout(removeTimer)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
    }
  }, [query, limit, canUseWorker])

  useEffect(
    () => () => {
      workerRef.current?.terminate()
      workerRef.current = null
    },
    [],
  )

  return syncResults ?? results
}
