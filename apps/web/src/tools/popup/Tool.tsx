import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { PopupToolInput } from './schema'
import { EXAMPLE_INPUT, generatePopup, parsePopupInput, renderPopupFiles } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: PopupToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(renderPopupFiles(generatePopup(parsePopupInput(input.text))))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<PopupToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ ...EXAMPLE_INPUT, features: ['tabs', 'storage', 'i18n'] }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="popup-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              生成三文件模板
            </button>
          </div>
          {error !== '' && (
            <p data-testid="popup-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="popup-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON 配置（title / width / height / features），生成
            popup.html / popup.js / popup.css。features 可选 tabs / storage /
            i18n。尺寸上限 800×600（Chrome popup 限制）。纯本地生成。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
