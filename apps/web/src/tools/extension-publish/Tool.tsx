import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ExtensionPublishToolInput } from './schema'
import { checkPublishReady, parsePublishInput, renderPublishResults, STORE_NAMES } from './utils'
import type { StoreId } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'rounded border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-900'

const EXAMPLE_MANIFEST = `{
  "manifest_version": 3,
  "name": "示例扩展",
  "version": "1.0.0",
  "description": "示例描述",
  "icons": { "128": "icon128.png" },
  "permissions": ["storage"]
}`

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [store, setStore] = useState<StoreId>('chrome')
  const [filesText, setFilesText] = useState('manifest.json\nicon128.png')
  const [extraText, setExtraText] = useState(
    '{\n  "zipSizeKb": 512,\n  "hasScreenshots": true,\n  "hasPrivacyPolicy": false\n}',
  )

  function handleCheck(input: ExtensionPublishToolInput): void {
    setError('')
    setOutput('')
    try {
      const extra = parsePublishInput(extraText)
      const files = filesText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '')
      const results = checkPublishReady({
        store,
        manifestText: input.text,
        files,
        zipSizeKb: extra.zipSizeKb,
        hasScreenshots: extra.hasScreenshots,
        hasPrivacyPolicy: extra.hasPrivacyPolicy,
      })
      setOutput(renderPublishResults(store, results))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ExtensionPublishToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_MANIFEST }}
      initialOptions={{}}
      example={{ text: EXAMPLE_MANIFEST }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              目标商店
              <select
                data-testid="extpublish-store"
                value={store}
                onChange={(e) => setStore(e.target.value as StoreId)}
                className={`ml-2 ${INPUT_CLS}`}
              >
                {(Object.keys(STORE_NAMES) as StoreId[]).map((s) => (
                  <option key={s} value={s}>
                    {STORE_NAMES[s]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              data-testid="extpublish-run"
              onClick={() => handleCheck(input)}
              className={BTN_CLS}
            >
              开始检查
            </button>
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            扩展文件列表（每行一个文件名）
            <textarea
              data-testid="extpublish-files"
              value={filesText}
              onChange={(e) => setFilesText(e.target.value)}
              rows={3}
              spellCheck={false}
              className="rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            附加信息 JSON（zipSizeKb 打包大小 / hasScreenshots 截图 / hasPrivacyPolicy 隐私政策）
            <textarea
              data-testid="extpublish-extra"
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              rows={5}
              spellCheck={false}
              className="rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          {error !== '' && (
            <p data-testid="extpublish-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="extpublish-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：在上方输入框粘贴 manifest.json，选择目标商店并填写文件列表与附加信息，
            点击「开始检查」逐项评估。纯本地评估，不发送网络请求；各商店具体要求以官方文档为准。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
