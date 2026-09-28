import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { OptionsToolInput } from './schema'
import { EXAMPLE_INPUT, generateOptionsPage, parseOptionsInput, renderOptionsFiles } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: OptionsToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(renderOptionsFiles(generateOptionsPage(parseOptionsInput(input.text))))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<OptionsToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{
        text: JSON.stringify({ fields: [{ key: 'name', label: '昵称', type: 'text' }] }, null, 2),
      }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="options-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              生成选项页模板
            </button>
          </div>
          {error !== '' && (
            <p data-testid="options-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="options-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON 的 fields 数组（key / label / type / options / defaultValue），生成
            options.html / options.js。type 可选 text / checkbox / select / number，配置经
            chrome.storage.sync 读写。纯本地生成。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
