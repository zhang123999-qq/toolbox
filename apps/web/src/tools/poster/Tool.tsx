import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { buildPosterData, exportFileName, localizeError, toPlainText } from './utils'
import type { PosterData } from './utils'
import type { PosterInput, PosterOptions } from './schema'

/** 示例：完整的海报 */
const EXAMPLE: PosterInput = {
  text: '秋日特惠，全场八折\n活动时间：10 月 1 日 - 10 月 7 日\n欢迎到店选购',
  title: '金秋大促',
  subtitle: '一年一度的购物盛宴',
  footer: '星辰百货 · 敬上',
}

/** html-to-image 导出倍率：2x 保证 PNG 清晰度 */
const EXPORT_PIXEL_RATIO = 2

/** 主题配色（内联渐变，无外部图片/字体） */
interface PosterThemeStyle {
  readonly background: string
  readonly accent: string
  readonly text: string
  readonly subText: string
}

const PAPER_STYLE: CSSProperties = {
  color: '#ffffff',
  padding: '48px 40px',
  fontFamily:
    '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  lineHeight: 1.7,
  aspectRatio: '3 / 4',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  textAlign: 'center',
}
const TITLE_STYLE: CSSProperties = {
  fontSize: '36px',
  fontWeight: 800,
  margin: 0,
  letterSpacing: '6px',
}
const SUBTITLE_STYLE: CSSProperties = { fontSize: '16px', margin: '12px 0 0', opacity: 0.9 }
const BODY_STYLE: CSSProperties = {
  fontSize: '17px',
  margin: '28px 0 0',
  whiteSpace: 'pre-line',
  lineHeight: 2,
}
const FOOTER_STYLE: CSSProperties = { fontSize: '13px', margin: '32px 0 0', opacity: 0.85 }
const DIVIDER_STYLE: CSSProperties = { width: '64px', height: '3px', margin: '20px auto 0' }

export default function Tool() {
  const t = useTranslate()
  const previewRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const themeNames = [
    t('poster.theme.orange'),
    t('poster.theme.blue'),
    t('poster.theme.green'),
    t('poster.theme.dark'),
  ]
  const themeStyles: Record<string, PosterThemeStyle> = {
    [t('poster.theme.orange')]: {
      background: 'linear-gradient(135deg, #f97316 0%, #db2777 100%)',
      accent: '#fef3c7',
      text: '#ffffff',
      subText: '#ffedd5',
    },
    [t('poster.theme.blue')]: {
      background: 'linear-gradient(135deg, #0ea5e9 0%, #1e3a8a 100%)',
      accent: '#bae6fd',
      text: '#ffffff',
      subText: '#e0f2fe',
    },
    [t('poster.theme.green')]: {
      background: 'linear-gradient(135deg, #16a34a 0%, #14532d 100%)',
      accent: '#bbf7d0',
      text: '#ffffff',
      subText: '#dcfce7',
    },
    [t('poster.theme.dark')]: {
      background: 'linear-gradient(135deg, #1e293b 0%, #020617 100%)',
      accent: '#f59e0b',
      text: '#f8fafc',
      subText: '#cbd5e1',
    },
  }
  const optionDefs: readonly OptionDef<PosterOptions>[] = [
    { key: 'theme', label: t('poster.theme'), kind: 'select', values: themeNames },
  ]

  /** 导出 PNG：html-to-image 只在点击时动态加载，不进主包 */
  async function exportPng(data: PosterData): Promise<void> {
    const node = previewRef.current
    if (!node) return
    setExporting(true)
    setExportError('')
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { pixelRatio: EXPORT_PIXEL_RATIO, cacheBust: true })
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = exportFileName(data)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setExportError(
        t('export.failed', { reason: error instanceof Error ? error.message : String(error) }),
      )
    } finally {
      setExporting(false)
    }
  }

  function renderPreview(input: PosterInput, options: PosterOptions) {
    let data: PosterData | null
    try {
      data = buildPosterData(input, options, themeNames, t)
    } catch (error) {
      return (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {localizeError(error, t)}
        </p>
      )
    }
    if (!data) return <p className="text-sm text-slate-500">{t('poster.empty')}</p>
    const style = themeStyles[data.theme] ?? themeStyles[themeNames[0]]
    return (
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="export-png"
            disabled={exporting}
            className={SECONDARY_BUTTON}
            onClick={() => void exportPng(data)}
          >
            {exporting ? t('export.exporting') : t('export.png')}
          </button>
          {exportError === '' ? null : (
            <p
              role="alert"
              data-testid="export-error"
              className="text-sm text-red-700 dark:text-red-300"
            >
              {exportError}
            </p>
          )}
        </div>
        <div
          ref={previewRef}
          data-testid="poster-preview"
          style={{ ...PAPER_STYLE, background: style.background, color: style.text }}
        >
          {data.title === '' ? null : <h2 style={TITLE_STYLE}>{data.title}</h2>}
          {data.subtitle === '' ? null : (
            <p style={{ ...SUBTITLE_STYLE, color: style.subText }}>{data.subtitle}</p>
          )}
          {(data.title !== '' || data.subtitle !== '') && data.body !== '' ? (
            <div style={{ ...DIVIDER_STYLE, backgroundColor: style.accent }} />
          ) : null}
          {data.body === '' ? null : <p style={BODY_STYLE}>{data.body}</p>}
          {data.footer === '' ? null : (
            <p style={{ ...FOOTER_STYLE, color: style.subText }}>{data.footer}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <MultiPanel<PosterInput, PosterOptions>
      meta={meta}
      initialInput={{ text: '', title: '', subtitle: '', footer: '' }}
      initialOptions={{ theme: t('poster.theme.orange') }}
      optionDefs={optionDefs}
      example={EXAMPLE}
      extraInputs={[
        { key: 'title', label: t('poster.field.title'), rows: 1 },
        { key: 'subtitle', label: t('poster.field.subtitle'), rows: 1 },
        { key: 'footer', label: t('poster.field.footer'), rows: 1 },
      ]}
      renderOutput={renderPreview}
      toText={(input, options) => toPlainText(input, options, themeNames, t)}
      downloadExt="txt"
    />
  )
}
