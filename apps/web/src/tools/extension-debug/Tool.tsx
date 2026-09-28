import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ExtensionDebugToolInput } from './schema'
import { diagnoseExtension, renderDebugIssues } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE_MANIFEST = `{
  "manifest_version": 3,
  "name": "示例扩展",
  "version": "1.0.0",
  "background": { "service_worker": "background.js" },
  "icons": { "128": "icon128.png" },
  "host_permissions": ["<all_urls>"]
}`

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [filesText, setFilesText] = useState('background.js\nicon128.png\nmanifest.json')

  function handleDiagnose(input: ExtensionDebugToolInput): void {
    setError('')
    setOutput('')
    try {
      const files = filesText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '')
      setOutput(renderDebugIssues(diagnoseExtension(input.text, files)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ExtensionDebugToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_MANIFEST }}
      initialOptions={{}}
      example={{ text: EXAMPLE_MANIFEST }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            扩展文件列表（每行一个文件名，用于检查引用文件是否存在）
            <textarea
              data-testid="extdebug-files"
              value={filesText}
              onChange={(e) => setFilesText(e.target.value)}
              rows={4}
              spellCheck={false}
              className="rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="extdebug-run"
              onClick={() => handleDiagnose(input)}
              className={BTN_CLS}
            >
              开始诊断
            </button>
          </div>
          {error !== '' && (
            <p data-testid="extdebug-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="extdebug-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：在上方输入框粘贴 manifest.json，点击「开始诊断」检查 MV2 残留字段、
            background 声明、图标文件存在性与权限宽泛度。文件列表用于核对引用的
            service_worker 与图标是否存在。纯本地诊断，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
