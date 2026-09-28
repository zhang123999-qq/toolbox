import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { EdgeCacheInput, EdgeCacheOptions } from './schema'
import { buildCacheHeaders, describeParsed, EXAMPLE_CACHE_HEADER, parseCacheControl } from './utils'

function parseOptionalInt(raw: string, field: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  if (!/^\d+$/.test(trimmed)) throw new Error(`${field} 须为非负整数`)
  return Number(trimmed)
}

interface CacheView {
  error: string
  header: string
  detail: string
}

function buildView(input: EdgeCacheInput, options: EdgeCacheOptions): CacheView {
  try {
    if (options.mode === 'parse') {
      const parsed = parseCacheControl(input.text)
      return {
        error: '',
        header: input.text.trim(),
        detail: describeParsed(parsed),
      }
    }
    const header = buildCacheHeaders({
      maxAge: parseOptionalInt(options.maxAge, 'max-age'),
      sMaxAge: parseOptionalInt(options.sMaxAge, 's-maxage'),
      staleWhileRevalidate: parseOptionalInt(
        options.staleWhileRevalidate,
        'stale-while-revalidate',
      ),
      immutable: options.immutable,
      noStore: options.noStore,
      noCache: options.noCache,
      mustRevalidate: options.mustRevalidate,
    })
    return {
      error: '',
      header,
      detail: header === '' ? '未选择任何指令' : describeParsed(parseCacheControl(header)),
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', header: '', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<EdgeCacheInput, EdgeCacheOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_CACHE_HEADER }}
      initialOptions={{
        mode: 'build',
        maxAge: '3600',
        sMaxAge: '86400',
        staleWhileRevalidate: '60',
        immutable: false,
        noStore: false,
        noCache: false,
        mustRevalidate: false,
      }}
      example={{ text: EXAMPLE_CACHE_HEADER }}
      optionDefs={[
        { key: 'mode', label: '模式', kind: 'select', values: ['build', 'parse'] },
        { key: 'maxAge', label: 'max-age（秒）', kind: 'text' },
        { key: 'sMaxAge', label: 's-maxage（秒）', kind: 'text' },
        { key: 'staleWhileRevalidate', label: 'stale-while-revalidate（秒）', kind: 'text' },
        { key: 'immutable', label: 'immutable', kind: 'boolean' },
        { key: 'noStore', label: 'no-store', kind: 'boolean' },
        { key: 'noCache', label: 'no-cache', kind: 'boolean' },
        { key: 'mustRevalidate', label: 'must-revalidate', kind: 'boolean' },
      ]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="edge-cache-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.header !== '' && (
              <div>
                <p
                  data-testid="edge-cache-header"
                  className="whitespace-pre-wrap font-mono text-sm font-semibold"
                >
                  {view.header}
                </p>
                <p
                  data-testid="edge-cache-detail"
                  className="mt-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  {view.detail}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：build 模式用右侧表单拼装 Cache-Control；parse 模式在左侧粘贴已有响应头进行解析。
              no-store 勾选后独占输出。
            </p>
          </div>
        )
      }}
      toText={(input, options) => {
        const view = buildView(input, options)
        return view.error !== '' ? view.error : view.header
      }}
      downloadExt="txt"
    />
  )
}
