import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { buildResumeData, exportFileName, localizeError, toPlainText } from './utils'
import type { ResumeData } from './utils'
import type { ResumeInput, ResumeOptions } from './schema'

/** 示例：完整填写的简历 */
const EXAMPLE: ResumeInput = {
  text: '陈静',
  title: '高级前端工程师',
  phone: '138-0000-1234',
  email: 'chenjing@example.com',
  summary: '8 年前端开发经验，专注 React 生态与工程化，主导过 3 个千万级 PV 项目。',
  experience:
    '2021–至今  星辰科技  高级前端工程师\n负责核心业务线前端架构，推动构建速度提升 60%。\n2018–2021  蓝海互联  前端工程师\n参与电商平台重构，用户转化率提升 12%。',
  education: '2014–2018  杭州电子科技大学  计算机科学与技术（本科）',
  skills: 'React / TypeScript / Vite / Node.js / 性能优化',
}

/** html-to-image 导出倍率：2x 保证 PNG 清晰度 */
const EXPORT_PIXEL_RATIO = 2

/** 预览用内联样式（固定浅色纸面，保证导出 PNG 与预览一致，不受深色主题影响） */
const PAPER_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#1e293b',
  padding: '36px 40px',
  fontFamily:
    '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  lineHeight: 1.7,
}
const NAME_STYLE: CSSProperties = { fontSize: '30px', fontWeight: 700, margin: '0 0 4px' }
const TITLE_STYLE: CSSProperties = { fontSize: '16px', color: '#0f766e', margin: '0 0 8px' }
const CONTACT_STYLE: CSSProperties = { fontSize: '13px', color: '#64748b', margin: '0 0 20px' }
const SECTION_TITLE_STYLE: CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  borderBottom: '2px solid #0f766e',
  paddingBottom: '4px',
  margin: '20px 0 8px',
}
const SECTION_BODY_STYLE: CSSProperties = {
  fontSize: '14px',
  margin: '0 0 4px',
  whiteSpace: 'pre-line',
}

/** 章节：标题 + 正文（正文为空不渲染；React 自动转义文本，防 HTML 注入破坏布局） */
function Section({ title, body }: { title: string; body: string }) {
  if (body === '') return null
  return (
    <div>
      <h3 style={SECTION_TITLE_STYLE}>{title}</h3>
      <p style={SECTION_BODY_STYLE}>{body}</p>
    </div>
  )
}

export default function Tool() {
  const t = useTranslate()
  const previewRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  /** 导出 PNG：html-to-image 只在点击时动态加载，不进主包 */
  async function exportPng(data: ResumeData): Promise<void> {
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

  function renderPreview(input: ResumeInput) {
    let data: ResumeData | null
    try {
      data = buildResumeData(input, t)
    } catch (error) {
      return (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {localizeError(error, t)}
        </p>
      )
    }
    if (!data) return <p className="text-sm text-slate-500">{t('resume.empty')}</p>
    const contact = [data.phone, data.email].filter((part) => part !== '').join(' / ')
    return (
      <div>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('resume.hint')}</p>
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
        <div ref={previewRef} data-testid="resume-preview" style={PAPER_STYLE}>
          <h2 style={NAME_STYLE}>{data.name}</h2>
          {data.title === '' ? null : <p style={TITLE_STYLE}>{data.title}</p>}
          {contact === '' ? null : <p style={CONTACT_STYLE}>{contact}</p>}
          <Section title={t('resume.field.summary')} body={data.summary} />
          <Section title={t('resume.field.experience')} body={data.experience} />
          <Section title={t('resume.field.education')} body={data.education} />
          <Section title={t('resume.field.skills')} body={data.skills} />
        </div>
      </div>
    )
  }

  return (
    <MultiPanel<ResumeInput, ResumeOptions>
      meta={meta}
      initialInput={{
        text: '',
        title: '',
        phone: '',
        email: '',
        summary: '',
        experience: '',
        education: '',
        skills: '',
      }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[
        { key: 'title', label: t('resume.field.title'), rows: 1 },
        { key: 'phone', label: t('resume.field.phone'), rows: 1 },
        { key: 'email', label: t('resume.field.email'), rows: 1 },
        { key: 'summary', label: t('resume.field.summary'), rows: 3 },
        { key: 'experience', label: t('resume.field.experience'), rows: 4 },
        { key: 'education', label: t('resume.field.education'), rows: 2 },
        { key: 'skills', label: t('resume.field.skills'), rows: 2 },
      ]}
      renderOutput={renderPreview}
      toText={(input) => toPlainText(input, t)}
      downloadExt="txt"
    />
  )
}
