import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ExtensionPackToolInput } from './schema'
import { EXAMPLE_PACK, packExtension, parsePackInput, summarizePack } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [blobUrl, setBlobUrl] = useState('')

  function handleRun(input: ExtensionPackToolInput): void {
    setError('')
    setOutput('')
    setBlobUrl('')
    try {
      const { files } = parsePackInput(input.text)
      const zip = packExtension(files)
      const blob = new Blob([zip as unknown as BlobPart], { type: 'application/zip' })
      setBlobUrl(URL.createObjectURL(blob))
      setOutput(summarizePack(zip, files))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ExtensionPackToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_PACK, null, 2) }}
      initialOptions={{}}
      example={{
        text: JSON.stringify(
          {
            files: [
              ...EXAMPLE_PACK.files,
              { name: 'popup.html', content: '<!doctype html><html><body></body></html>\n' },
            ],
          },
          null,
          2,
        ),
      }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="extensionpack-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              打包为 zip
            </button>
          </div>
          {error !== '' && (
            <p data-testid="extensionpack-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <div className="flex flex-col gap-2">
              <pre data-testid="extensionpack-output" className={PRE_CLS}>
                {output}
              </pre>
              {blobUrl !== '' && (
                <a
                  data-testid="extensionpack-download"
                  href={blobUrl}
                  download="extension.zip"
                  className="text-sm text-blue-600 underline dark:text-blue-400"
                >
                  下载 extension.zip
                </a>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON 文件清单（files: [{'{'}name, content{'}'}]），必须包含
            manifest.json；文件名不允许绝对路径、反斜杠或 ..。打包在浏览器本地完成，
            可直接下载 zip 用于 Chrome 扩展开发者模式加载。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
