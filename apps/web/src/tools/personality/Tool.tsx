import { useState } from 'react'
import { meta } from './meta'
import { QUESTIONS, describeType, scoreAnswers, type Answer } from './utils'

function Questionnaire() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const submit = (): void => {
    try {
      const r = scoreAnswers(answers)
      const d = describeType(r.type)
      setResult(
        `你的人格类型是 ${r.type}（${d.name}）\n${d.desc}\n` +
          `维度：外向-内向 ${r.dims.EI}｜实感-直觉 ${r.dims.SN}｜思考-情感 ${r.dims.TF}｜判断-感知 ${r.dims.JP}`,
      )
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
      {QUESTIONS.map((q, idx) => (
        <fieldset key={q.id} className="flex flex-col gap-1">
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {idx + 1}. {q.text}
          </legend>
          <div className="flex flex-wrap gap-4">
            {(
              [
                ['a', q.optionA],
                ['b', q.optionB],
              ] as const
            ).map(([v, label]) => (
              <label
                key={v}
                className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  type="radio"
                  name={q.id}
                  data-testid={`personality-q-${q.id}-${v}`}
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
          data-testid="personality-submit"
          onClick={submit}
          className="w-fit rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          查看结果
        </button>
        <button
          type="button"
          data-testid="personality-retake"
          onClick={reset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          重新测试
        </button>
      </div>
      {error !== '' && (
        <p data-testid="personality-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {result !== '' && (
        <p
          data-testid="personality-result"
          className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
        >
          {result}
        </p>
      )}
      <p className="text-xs text-slate-500">娱乐参考，非专业心理测评，结果不作任何诊断依据。</p>
    </div>
  )
}

export default function Tool() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <Questionnaire />
    </div>
  )
}
