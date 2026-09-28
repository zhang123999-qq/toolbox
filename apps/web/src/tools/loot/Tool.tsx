import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { LootToolInput } from './schema'
import { formatLootStats, rollLoot, simulateLoot, type LootItem } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const INPUT_CLS =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE = JSON.stringify(
  [
    { id: 'gold', weight: 70, min: 10, max: 20 },
    { id: 'sword', weight: 20 },
    { id: 'gem', weight: 10 },
  ],
  null,
  2,
)

export default function Tool() {
  const [times, setTimes] = useState('1000')
  const [seed, setSeed] = useState('42')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function parseTable(input: LootToolInput): LootItem[] {
    let raw: unknown
    try {
      raw = JSON.parse(input.text)
    } catch {
      throw new Error('输入不是合法 JSON')
    }
    return raw as LootItem[]
  }

  function handleRoll(input: LootToolInput): void {
    setError('')
    try {
      const r = rollLoot(parseTable(input))
      setOutput(`掉落：${r.id} × ${r.count}`)
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleSim(input: LootToolInput): void {
    setError('')
    try {
      const rows = simulateLoot(parseTable(input), Number(times), Number(seed))
      setOutput(`模拟 ${times} 次（seed=${seed}）：\n${formatLootStats(rows)}`)
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<LootToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE }}
      initialOptions={{}}
      example={{ text: EXAMPLE }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" data-testid="loot-roll" onClick={() => handleRoll(input)} className={BTN_CLS}>
              单次抽取
            </button>
            <span className="text-xs text-slate-500">模拟次数</span>
            <input data-testid="loot-times" value={times} onChange={(e) => setTimes(e.target.value)} className={`${INPUT_CLS} w-24`} />
            <span className="text-xs text-slate-500">种子</span>
            <input data-testid="loot-seed" value={seed} onChange={(e) => setSeed(e.target.value)} className={`${INPUT_CLS} w-24`} />
            <button type="button" data-testid="loot-sim" onClick={() => handleSim(input)} className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600">
              模拟统计
            </button>
          </div>
          {error !== '' && (
            <p data-testid="loot-error" className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {output !== '' && (
            <pre data-testid="loot-output" className={PRE_CLS}>{output}</pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：掉落表为 JSON 数组，每项含 id、weight（权重），可选 min/max（掉落数量区间）。纯本地计算。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
