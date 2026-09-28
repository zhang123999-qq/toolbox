import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { TypingInput, TypingOptions } from './schema'
import { analyzeTyping, formatErrors } from './utils'

const DEFAULT_TARGET = 'The quick brown fox jumps over the lazy dog.'

interface TypingView {
  error: string
  detail: string
}

function buildView(input: TypingInput, options: TypingOptions): TypingView {
  try {
    const target = input.text.trim() === '' ? DEFAULT_TARGET : input.text
    const secondsRaw = options.seconds.trim()
    const seconds = Number(secondsRaw)
    if (secondsRaw === '' || Number.isNaN(seconds)) throw new Error('用时不是有效数字')
    const r = analyzeTyping(target, input.typed, seconds)
    return {
      error: '',
      detail:
        `速度：${r.wpm} WPM\n准确率：${r.accuracy}%（${r.correctChars}/${r.totalChars}）\n` +
        `错误 ${r.errorCount} 处：\n${formatErrors(r.errors)}`,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<TypingInput, TypingOptions>
      meta={meta}
      initialInput={{ text: DEFAULT_TARGET, typed: '' }}
      initialOptions={{ seconds: '60' }}
      example={{ text: DEFAULT_TARGET, typed: 'The quick brown fox jumps over the lazy dog.' }}
      extraInputs={[{ key: 'typed', label: '练习输入', rows: 6 }]}
      optionDefs={[{ key: 'seconds', label: '用时（秒）', kind: 'text' }]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="typing-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.detail !== '' && (
              <p
                data-testid="typing-detail"
                className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
              >
                {view.detail}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => buildView(input, options).detail}
    />
  )
}
