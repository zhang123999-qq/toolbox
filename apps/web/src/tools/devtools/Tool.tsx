import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { DevtoolsToolInput } from './schema'
import {
  EXAMPLE_DEVTOOLS,
  generateDevtoolsPage,
  parseDevtoolsInput,
  renderDevtoolsFiles,
  validateDevtoolsManifest,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [manifestText, setManifestText] = useState(
    '{\n  "manifest_version": 3,\n  "name": "示例扩展",\n  "version": "1.0.0",\n  "devtools_page": "devtools.html"\n}',
  )

  function handleGenerate(input: DevtoolsToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(renderDevtoolsFiles(generateDevtoolsPage(parseDevtoolsInput(input.text))))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleValidate(): void {
    setError('')
    setOutput('')
    try {
      const issues = validateDevtoolsManifest(manifestText)
      setOutput(
        issues.length === 0
          ? 'manifest 声明合法：manifest_version 为 3 且 devtools_page 指向 .html 文件。'
          : `发现 ${issues.length} 个问题：\n` + issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n'),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<DevtoolsToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_DEVTOOLS, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ panelTitle: '网络审计', sidebar: true }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="devtools-generate"
              onClick={() => handleGenerate(input)}
              className={BTN_CLS}
            >
              生成模板
            </button>
            <button
              type="button"
              data-testid="devtools-validate"
              onClick={handleValidate}
              className={BTN_CLS}
            >
              校验 manifest
            </button>
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            manifest.json（用于校验 devtools_page 声明）
            <textarea
              data-testid="devtools-manifest"
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              rows={6}
              spellCheck={false}
              className="rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          {error !== '' && (
            <p data-testid="devtools-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="devtools-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入面板配置 JSON（panelTitle 必填，sidebar 可选），生成 devtools.html /
            panel.html / panel.js 三个文件；下方粘贴 manifest.json 可校验 devtools_page
            声明。纯本地生成，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
