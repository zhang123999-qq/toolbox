import { useState } from 'react'
import { meta } from './meta'
import { SPREADS, drawSpread, formatDrawn, type DrawnCard } from './utils'

export default function Tool() {
  const [spreadId, setSpreadId] = useState('three')
  const [drawn, setDrawn] = useState<DrawnCard[]>([])

  const draw = (): void => {
    setDrawn(drawSpread(spreadId))
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex flex-wrap items-center gap-2">
        {SPREADS.map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`tarot-spread-${s.id}`}
            onClick={() => {
              setSpreadId(s.id)
              setDrawn([])
            }}
            className={`w-fit rounded px-3 py-1 text-sm ${
              spreadId === s.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            {s.name}
          </button>
        ))}
        <button
          type="button"
          data-testid="tarot-draw"
          onClick={draw}
          className="w-fit rounded bg-purple-600 px-3 py-1 text-sm text-white"
        >
          抽牌
        </button>
      </div>
      {drawn.length > 0 && (
        <div className="flex flex-col gap-2">
          {drawn.map((d, i) => (
            <p
              key={`${d.card.id}-${i}`}
              data-testid={`tarot-card-${i}`}
              className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
            >
              {formatDrawn(d)}
            </p>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">娱乐占卜，非预测工具；结果仅供参考。</p>
    </div>
  )
}
