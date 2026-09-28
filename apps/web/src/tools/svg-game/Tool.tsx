import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { SvgGameToolInput } from './schema'
import { getSpriteTemplate, listSpriteTemplates, renderSpriteTemplate } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

export default function Tool() {
  const templates = listSpriteTemplates()
  const [templateId, setTemplateId] = useState('slime')
  const [primary, setPrimary] = useState(getSpriteTemplate('slime').defaultPrimary)
  const [secondary, setSecondary] = useState(getSpriteTemplate('slime').defaultSecondary)
  const [error, setError] = useState('')

  const svg = (() => {
    try {
      return renderSpriteTemplate(templateId, { primary, secondary })
    } catch {
      return ''
    }
  })()

  function handleSelect(id: string): void {
    setError('')
    setTemplateId(id)
    const t = getSpriteTemplate(id)
    setPrimary(t.defaultPrimary)
    setSecondary(t.defaultSecondary)
  }

  function handleCopy(): void {
    setError('')
    try {
      void navigator.clipboard.writeText(svg)
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制失败')
    }
  }

  function handleDownload(): void {
    setError('')
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${templateId}.svg`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '下载失败')
    }
  }

  return (
    <MultiPanel<SvgGameToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={(_input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              模板{' '}
              <select
                data-testid="svggame-template"
                value={templateId}
                onChange={(e) => handleSelect(e.target.value)}
                className={INPUT_CLS}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}（{t.category}）
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              主色 <input type="color" data-testid="svggame-primary" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-8 w-12" />
            </label>
            <label className="text-xs text-slate-500">
              副色 <input type="color" data-testid="svggame-secondary" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-8 w-12" />
            </label>
            <button type="button" data-testid="svggame-copy" onClick={handleCopy} className={BTN_CLS}>
              复制 SVG
            </button>
            <button type="button" data-testid="svggame-download" onClick={handleDownload} className={BTN_CLS}>
              下载 SVG
            </button>
          </div>
          <div className="flex items-start gap-4">
            <div
              data-testid="svggame-preview"
              className="rounded border border-slate-300 p-4 dark:border-slate-600"
              dangerouslySetInnerHTML={{ __html: svg.replace('width="64" height="64"', 'width="128" height="128"') }}
            />
            <pre data-testid="svggame-output" className={`${PRE_CLS} flex-1`}>
              {svg}
            </pre>
          </div>
          {error !== '' && (
            <p data-testid="svggame-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：8 种游戏精灵模板（角色/道具/地形/特效），主/副配色可参数化替换；
            切换模板时配色重置为该模板默认值。纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => svg}
    />
  )
}
