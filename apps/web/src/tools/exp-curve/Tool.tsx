import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ExpCurveToolInput } from './schema'
import {
  buildExpTable,
  formatExpTable,
  levelForTotalExp,
  type ExpCurveInput,
  type ExpMode,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const INPUT_CLS =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const MODES: ExpMode[] = ['linear', 'exponential']

const HINTS: Record<ExpMode, string> = {
  linear: '{"base":100,"growth":50}',
  exponential: '{"base":100,"growth":1.15}',
}

export default function Tool() {
  const [mode, setMode] = useState<ExpMode>('linear')
  const [maxLevel, setMaxLevel] = useState('10')
  const [totalExp, setTotalExp] = useState('1000')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function buildInput(input: ExpCurveToolInput): ExpCurveInput {
    let raw: unknown
    try {
      raw = JSON.parse(input.text)
    } catch {
      throw new Error('输入不是合法 JSON')
    }
    const o = raw as Record<string, number>
    return { base: o.base, growth: o.growth, mode }
  }

  function handleTable(input: ExpCurveToolInput): void {
    setError('')
    try {
      const rows = buildExpTable(buildInput(input), Number(maxLevel))
      setOutput(formatExpTable(rows))
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleLookup(input: ExpCurveToolInput): void {
    setError('')
    try {
      const lv = levelForTotalExp(buildInput(input), Number(totalExp), Number(maxLevel))
      setOutput(`累计 ${totalExp} 经验 → Lv.${lv}`)
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ExpCurveToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: HINTS.linear }}
      initialOptions={{}}
      example={{ text: HINTS.linear }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`exp-mode-${m}`}
                onClick={() => setMode(m)}
                className={
                  m === mode
                    ? BTN_CLS
                    : 'rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600'
                }
              >
                {m}
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            参数示例：{HINTS[mode]}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">表上限</span>
            <input
              data-testid="exp-maxlevel"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value)}
              className={`${INPUT_CLS} w-20`}
            />
            <button
              type="button"
              data-testid="exp-table"
              onClick={() => handleTable(input)}
              className={BTN_CLS}
            >
              生成经验表
            </button>
            <span className="text-xs text-slate-500">累计经验</span>
            <input
              data-testid="exp-totalexp"
              value={totalExp}
              onChange={(e) => setTotalExp(e.target.value)}
              className={`${INPUT_CLS} w-24`}
            />
            <button
              type="button"
              data-testid="exp-lookup"
              onClick={() => handleLookup(input)}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600"
            >
              反查等级
            </button>
          </div>
          {error !== '' && (
            <p data-testid="exp-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="exp-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：linear 为 base + growth×(level-1)；exponential 为 base ×
            growth^(level-1)。纯本地计算。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
