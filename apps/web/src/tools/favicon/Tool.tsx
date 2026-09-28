import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildFaviconSvg, randomSeed } from './utils'
import type { FaviconInput, FaviconOptions } from './schema'

/** 示例：F */
const EXAMPLE: FaviconInput = { text: 'F' }

const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

/** 把 SVG 字符串绘制到 canvas 并下载为 PNG */
function downloadPng(svg: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 64
      canvas.height = img.naturalHeight || 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = 'favicon.png'
        a.click()
      }
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}

export default function Tool() {
  const [seed] = useState(() => randomSeed())

  const optionDefs: readonly OptionDef<FaviconOptions>[] = [
    { key: 'size', label: '尺寸', kind: 'text', placeholder: '128' },
    { key: 'style', label: '样式', kind: 'select', values: ['letter', 'gradient', 'geometric'] },
    { key: 'bgColor', label: '背景色', kind: 'text', placeholder: '#ffffff' },
    { key: 'fgColor', label: '前景色', kind: 'text', placeholder: '#333333' },
  ]

  return (
    <MultiPanel<FaviconInput, FaviconOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ size: '64', style: 'letter', bgColor: '', fgColor: '#ffffff' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => {
        try {
          const svg = buildFaviconSvg(input, options, seed)
          return (
            <div className="flex flex-col items-center gap-4 p-4">
              <div
                data-testid="favicon-svg"
                className="rounded border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <button
                type="button"
                data-testid="export-png"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => downloadPng(svg)}
              >
                导出 PNG
              </button>
            </div>
          )
        } catch (error) {
          return (
            <p role="alert" className={ERROR_CLASS}>
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={(input, options) => {
        try {
          return buildFaviconSvg(input, options, seed)
        } catch {
          return ''
        }
      }}
      downloadExt="svg"
    />
  )
}
