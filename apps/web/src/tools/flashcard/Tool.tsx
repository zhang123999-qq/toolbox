import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { FlashcardInput, FlashcardOptions } from './schema'
import { deckStats, dueCards, gradeCard, importDeckCsv, type Flashcard } from './utils'

const DEFAULT_CSV = 'apple,苹果\nbook,书\ncat,猫'

interface DeckView {
  error: string
  detail: string
}

function buildView(input: FlashcardInput, options: FlashcardOptions): DeckView {
  try {
    const csv = input.text.trim() === '' ? DEFAULT_CSV : input.text
    const deck = importDeckCsv(csv)
    if (options.mode === 'stats') {
      const s = deckStats(deck)
      return { error: '', detail: `共 ${s.total} 张卡片，到期 ${s.due} 张，新卡 ${s.fresh} 张` }
    }
    const due = dueCards(deck)
    return {
      error: '',
      detail:
        due.length === 0 ? '暂无到期卡片' : due.map((c) => `• ${c.front} → ${c.back}`).join('\n'),
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', detail: '' }
  }
}

function StudySession({ csv }: { csv: string }) {
  const [deck, setDeck] = useState<Flashcard[]>(() => {
    try {
      return importDeckCsv(csv.trim() === '' ? DEFAULT_CSV : csv)
    } catch {
      return []
    }
  })
  const [showBack, setShowBack] = useState(false)
  const [now] = useState(() => Date.now())

  if (deck.length === 0) {
    return (
      <p data-testid="flashcard-empty" className="text-sm text-slate-500">
        牌组为空或 CSV 格式错误
      </p>
    )
  }
  const due = dueCards(deck, now)
  const current = due[0]
  if (!current) {
    return (
      <p data-testid="flashcard-done" className="text-sm text-green-700 dark:text-green-400">
        本轮学习完成 🎉
      </p>
    )
  }
  const grade = (q: number): void => {
    setDeck((prev) => prev.map((c) => (c.id === current.id ? gradeCard(c, q) : c)))
    setShowBack(false)
  }
  return (
    <div className="flex flex-col gap-3">
      <p data-testid="flashcard-front" className="text-lg font-medium">
        {current.front}
      </p>
      {showBack ? (
        <>
          <p data-testid="flashcard-back" className="text-base text-slate-700 dark:text-slate-300">
            {current.back}
          </p>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                type="button"
                data-testid={`flashcard-grade-${q}`}
                onClick={() => grade(q)}
                className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"
              >
                {q}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          type="button"
          data-testid="flashcard-show"
          onClick={() => setShowBack(true)}
          className="w-fit rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          显示答案
        </button>
      )}
      <p data-testid="flashcard-progress" className="text-xs text-slate-500">
        剩余 {due.length} 张
      </p>
    </div>
  )
}

export default function Tool() {
  return (
    <MultiPanel<FlashcardInput, FlashcardOptions>
      meta={meta}
      initialInput={{ text: DEFAULT_CSV }}
      initialOptions={{ mode: 'study' }}
      example={{ text: 'hello,你好\nworld,世界' }}
      optionDefs={[
        { key: 'mode', label: '模式', kind: 'select', values: ['study', 'due', 'stats'] },
      ]}
      renderOutput={(input, options) => {
        if (options.mode === 'study') {
          return <StudySession key={input.text} csv={input.text} />
        }
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="flashcard-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.detail !== '' && (
              <p
                data-testid="flashcard-detail"
                className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
              >
                {view.detail}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) =>
        options.mode === 'study' ? '' : buildView(input, options).detail
      }
    />
  )
}
