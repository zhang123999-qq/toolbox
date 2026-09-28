import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ContentScriptToolInput } from './schema'
import { EXAMPLE_INPUT, generateContentScript, parseContentScriptInput } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: ContentScriptToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(generateContentScript(parseContentScriptInput(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ContentScriptToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ ...EXAMPLE_INPUT, runAt: 'document_start' }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="contentscript-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              生成 content.js
            </button>
          </div>
          {error !== '' && (
            <p data-testid="contentscript-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="contentscript-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON 配置（matches / runAt / features），生成可直接放进扩展目录的
            content.js 模板。features 可选 dom-observe / context-menu / storage-sync。
            纯本地生成，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
