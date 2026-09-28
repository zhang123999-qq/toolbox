import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { DamageToolInput } from './schema'
import { calcDamage, formatDamageResult } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE = '{"atk":100,"def":50,"critRate":0.2,"critMult":2,"variance":0.1}'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleCalc(input: DamageToolInput): void {
    setError('')
    try {
      let raw: unknown
      try {
        raw = JSON.parse(input.text)
      } catch {
        throw new Error('输入不是合法 JSON')
      }
      const o = raw as Record<string, number>
      const r = calcDamage({
        atk: o.atk,
        def: o.def,
        critRate: o.critRate,
        critMult: o.critMult,
        variance: o.variance,
      })
      setOutput(formatDamageResult(r))
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<DamageToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE }}
      initialOptions={{}}
      example={{ text: EXAMPLE }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            参数示例：{EXAMPLE}
          </p>
          <div>
            <button
              type="button"
              data-testid="dmg-calc"
              onClick={() => handleCalc(input)}
              className={BTN_CLS}
            >
              计算伤害
            </button>
          </div>
          {error !== '' && (
            <p data-testid="dmg-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="dmg-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：基础值 = atk²/(atk+def)；暴击时 × critMult；variance 为伤害浮动比例（最终
            ×(1±variance)）；结果至少为 1。纯本地计算。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
