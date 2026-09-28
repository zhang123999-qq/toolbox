import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { CrossBrowserToolInput } from './schema'
import { EXAMPLE_INPUT, listApis, parseCrossBrowserInput, runCrossBrowser } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: CrossBrowserToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(runCrossBrowser(parseCrossBrowserInput(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<CrossBrowserToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{
        text: JSON.stringify({ task: 'scan', code: 'chrome.tabs.query({active: true});' }, null, 2),
      }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="crossbrowser-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              执行
            </button>
          </div>
          {error !== '' && (
            <p data-testid="crossbrowser-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="crossbrowser-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：task 取 polyfill 时按 apis 生成跨浏览器垫片（browser.* 优先，Chrome 回调转
            Promise）；task 取 scan 时扫描 code 中的 chrome.* 调用并给出 Firefox / Safari
            兼容性建议。可用 API：{listApis().join('、')}。纯本地处理。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
