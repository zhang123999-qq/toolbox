import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { BackgroundToolInput } from './schema'
import { EXAMPLE_INPUT, generateBackground, parseBackgroundInput } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: BackgroundToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(generateBackground(parseBackgroundInput(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<BackgroundToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ events: ['alarms', 'contextMenus'], keepAlive: true }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="background-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              生成 background.js
            </button>
          </div>
          {error !== '' && (
            <p data-testid="background-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="background-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON 配置（events 可选 alarms / runtime.onInstalled /
            contextMenus / runtime.onMessage / tabs.onUpdated，keepAlive
            为是否追加保活说明），生成 Manifest V3 Service Worker
            模板。注意 MV3 不支持 persistent 后台页，Service
            Worker 会被浏览器休眠，周期任务请用 chrome.alarms。纯本地生成。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
