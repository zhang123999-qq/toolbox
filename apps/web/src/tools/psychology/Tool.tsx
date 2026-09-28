import { useState } from 'react'
import { meta } from './meta'
import { SCALES, formatScore, getScale, scoreScale } from './utils'

function ScaleForm({ scaleId }: { scaleId: string }) {
  const scale = getScale(scaleId)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const submit = (): void => {
    try {
      const ordered = scale.questions.map((q) => answers[q.id])
      const missing = ordered.filter((v) => v === undefined).length
      if (missing > 0) {
        setError(`还有 ${missing} 道题未作答`)
        setResult('')
        return
      }
      const score = scoreScale(scaleId, ordered as number[])
      setResult(formatScore(scale, score))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '计分失败')
      setResult('')
    }
  }

  const reset = (): void => {
    setAnswers({})
    setResult('')
    setError('')
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{scale.note}</p>
      {scale.questions.map((q, idx) => (
        <fieldset key={q.id} className="flex flex-col gap-1">
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {idx + 1}. {q.text}
          </legend>
          <div className="flex flex-wrap gap-3">
            {scale.options.map((label, v) => (
              <label
                key={v}
                className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  type="radio"
                  name={`${scaleId}-${q.id}`}
                  data-testid={`psychology-q-${q.id}-${v}`}
                  checked={answers[q.id] === v}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="psychology-submit"
          onClick={submit}
          className="w-fit rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          查看评估
        </button>
        <button
          type="button"
          data-testid="psychology-retake"
          onClick={reset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          重新测试
        </button>
      </div>
      {error !== '' && (
        <p data-testid="psychology-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {result !== '' && (
        <p
          data-testid="psychology-result"
          className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
        >
          {result}
        </p>
      )}
    </div>
  )
}

export default function Tool() {
  const [scaleId, setScaleId] = useState('stress')
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex gap-2">
        {SCALES.map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`psychology-scale-${s.id}`}
            onClick={() => setScaleId(s.id)}
            className={`w-fit rounded px-3 py-1 text-sm ${
              scaleId === s.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <ScaleForm key={scaleId} scaleId={scaleId} />
      <p className="text-xs text-slate-500">自评参考，非医学诊断；如感不适请咨询专业人士。</p>
    </div>
  )
}
