import { useState } from 'react'
import { meta } from './meta'
import { FORTUNES, LUCKS, drawFortune, formatFortune, fortunesByLuck, type Fortune } from './utils'

export default function Tool() {
  const [drawn, setDrawn] = useState<Fortune | null>(null)
  const [filter, setFilter] = useState('全部')

  const list = filter === '全部' ? FORTUNES : fortunesByLuck(filter)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div>
        <button
          type="button"
          data-testid="fortune-draw"
          onClick={() => setDrawn(drawFortune())}
          className="w-fit rounded bg-red-600 px-4 py-1 text-sm text-white"
        >
          求签
        </button>
      </div>
      {drawn && (
        <p
          data-testid="fortune-result"
          className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
        >
          {formatFortune(drawn)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {['全部', ...LUCKS].map((l) => (
            <button
              key={l}
              type="button"
              data-testid={`fortune-filter-${l}`}
              onClick={() => setFilter(l)}
              className={`w-fit rounded px-2 py-1 text-sm ${
                filter === l
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 dark:border-slate-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <ul className="flex max-h-64 flex-col gap-1 overflow-auto">
          {list.map((f) => (
            <li
              key={f.no}
              data-testid={`fortune-item-${f.no}`}
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              第 {f.no} 签{f.title}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate-500">娱乐占卜，非预测工具；结果仅供参考。</p>
    </div>
  )
}
