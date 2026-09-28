import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import type { TokenCountFormOptions, TokenCountInput } from './schema'
import { TOKENIZER_OPTIONS, countTokensWithEncode, formatTokenCount } from './utils'
import type { EncodeFn, TokenizerId } from './utils'

/**
 * 按分词器 id 动态导入 gpt-tokenizer，拿到 encode 函数。
 * 静态导入会把几 MB 的词表打进首屏包，故只在这里动态加载。
 */
async function loadEncode(id: TokenizerId): Promise<EncodeFn> {
  if (id === 'cl100k') {
    const mod = await import('gpt-tokenizer/encoding/cl100k_base')
    return mod.encode as EncodeFn
  }
  const mod = await import('gpt-tokenizer')
  return mod.encode as EncodeFn
}

export default function Tool() {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const optionDefs: readonly OptionDef<TokenCountFormOptions>[] = [
    {
      key: 'tokenizer',
      label: '分词器',
      kind: 'select',
      values: TOKENIZER_OPTIONS.map((o) => o.id),
    },
  ]

  async function handleCount(input: TokenCountInput, opts: TokenCountFormOptions): Promise<void> {
    setError('')
    setCount(null)
    setPending(true)
    try {
      const encode = await loadEncode(opts.tokenizer)
      setCount(countTokensWithEncode(input.text, encode))
    } catch (err) {
      setError(
        err instanceof Error &&
          /Failed to fetch|Loading chunk|mocking a module|import/i.test(err.message)
          ? '分词器加载失败：请检查网络后重试'
          : err instanceof Error
            ? err.message
            : '统计失败，请重试',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<TokenCountInput, TokenCountFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ tokenizer: 'o200k' }}
      optionDefs={optionDefs}
      example={{ text: 'Hello world! 你好，世界！' }}
      renderOutput={(input, options) => (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            当前分词器：
            {TOKENIZER_OPTIONS.find((o) => o.id === options.tokenizer)?.label}
            （首次使用时按需加载，约几 MB）
          </p>
          <div>
            <button
              type="button"
              data-testid="count"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleCount(input, options)}
            >
              {pending ? '统计中…' : '统计 Token'}
            </button>
          </div>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {count !== null ? (
            <p
              data-testid="token-result"
              className="text-lg font-medium text-slate-800 dark:text-slate-100"
            >
              {formatTokenCount(count)}
            </p>
          ) : null}
          {count === null && !pending && !error ? (
            <p className="text-sm text-slate-500">左侧输入文本，选择分词器后点「统计 Token」。</p>
          ) : null}
        </div>
      )}
      toText={() => (count === null ? '' : formatTokenCount(count))}
      downloadExt="txt"
    />
  )
}
