import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { GameValueToolInput } from './schema'
import {
  buildGrowthTable,
  formatGrowthTable,
  growthValue,
  type GrowthInput,
  type GrowthMode,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const INPUT_CLS =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const MODES: GrowthMode[] = ['linear', 'exponential', 'piecewise']

const HINTS: Record<GrowthMode, string> = {
  linear: '{"base":100,"perLevel":10}',
  exponential: '{"base":100,"perLevel":1.1}',
  piecewise: '{"breakpoints":[{"level":1,"value":100},{"level":10,"value":500}]}',
}

export default function Tool() {
  const [mode, setMode] = useState<GrowthMode>('linear')
  const [level, setLevel] = useState('5')
  const [maxLevel, setMaxLevel] = useState('10')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function buildInput(input: GameValueToolInput): GrowthInput {
    let raw: unknown
    try {
      raw = JSON.parse(input.text)
    } catch {
      throw new Error('输入不是合法 JSON')
    }
    const o = raw as Record<string, unknown>
    return {
      base: o.base as number,
      perLevel: (o.perLevel as number) ?? 0,
      mode,
      breakpoints: o.breakpoints as GrowthInput['breakpoints'],
    }
  }

  function handleCalc(input: GameValueToolInput): void {
    setError('')
    try {
      const lv = Number(level)
      const value = growthValue(lv, buildInput(input))
      setOutput(`Lv.${lv} 属性值 = ${Number(value.toFixed(4))}`)
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleTable(input: GameValueToolInput): void {
    setError('')
    try {
      const rows = buildGrowthTable(buildInput(input), Number(maxLevel))
      setOutput(formatGrowthTable(rows))
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<GameValueToolInput, Record<string, never>>
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
                data-testid={`gv-mode-${m}`}
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
            <span className="text-xs text-slate-500">等级</span>
            <input
              data-testid="gv-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={`${INPUT_CLS} w-20`}
            />
            <span className="text-xs text-slate-500">表上限</span>
            <input
              data-testid="gv-maxlevel"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value)}
              className={`${INPUT_CLS} w-20`}
            />
            <button
              type="button"
              data-testid="gv-calc"
              onClick={() => handleCalc(input)}
              className={BTN_CLS}
            >
              计算单级
            </button>
            <button
              type="button"
              data-testid="gv-table"
              onClick={() => handleTable(input)}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600"
            >
              生成等级表
            </button>
          </div>
          {error !== '' && (
            <p data-testid="gv-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="gv-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：linear 为 base + perLevel×(level-1)；exponential 为 base ×
            perLevel^(level-1)；piecewise 用 breakpoints 拐点线性插值。纯本地计算。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
