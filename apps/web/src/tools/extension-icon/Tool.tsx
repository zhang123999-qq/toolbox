import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ExtensionIconToolInput } from './schema'
import {
  EXAMPLE_ICON,
  ICON_SIZES,
  parseIconInput,
  renderIconDataUrl,
  type IconCanvas,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

function createRealCanvas(size: number): IconCanvas {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas as unknown as IconCanvas
}

export default function Tool() {
  const [previews, setPreviews] = useState<Array<{ size: number; url: string }>>([])
  const [error, setError] = useState('')

  function handleRun(input: ExtensionIconToolInput): void {
    setError('')
    setPreviews([])
    try {
      const params = parseIconInput(input.text)
      const list = ICON_SIZES.map((size) => ({
        size,
        url: renderIconDataUrl({ ...params, size }, createRealCanvas),
      }))
      setPreviews(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ExtensionIconToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_ICON, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ ...EXAMPLE_ICON, shape: 'circle', letter: 'E' }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="extensionicon-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              生成图标
            </button>
          </div>
          {error !== '' && (
            <p data-testid="extensionicon-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {previews.length > 0 && (
            <div data-testid="extensionicon-output" className="flex flex-col gap-2">
              {previews.map((p) => (
                <div key={p.size} className="flex items-center gap-3">
                  <img
                    data-testid={`extensionicon-preview-${p.size}`}
                    src={p.url}
                    alt={`${p.size}px 图标预览`}
                    width={p.size}
                    height={p.size}
                    className="rounded border border-slate-200 dark:border-slate-700"
                  />
                  <span className="font-mono text-xs">{p.size}px</span>
                  <a
                    data-testid={`extensionicon-download-${p.size}`}
                    href={p.url}
                    download={`icon${p.size}.png`}
                    className="text-sm text-blue-600 underline dark:text-blue-400"
                  >
                    下载 PNG
                  </a>
                </div>
              ))}
              <pre className={PRE_CLS}>{previews[0]?.url.slice(0, 120) + '…'}</pre>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON 参数（size 为基准尺寸，实际导出 16/48/128 三档； bg/fg 为
            #rrggbb；letter 1～2 字符；shape 为 rounded-square / circle）。
            绘制在浏览器本地完成，可直接下载 PNG 放入扩展目录。
          </p>
        </div>
      )}
      toText={() => previews.map((p) => `${p.size}px: ${p.url.slice(0, 80)}…`).join('\n')}
    />
  )
}
