import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildPdf, buildResumeData, toPlainText } from './utils'
import type { PdfResult } from './utils'
import type { ResumeInput } from './schema'

/** 示例：英文简历 */
const EXAMPLE: ResumeInput = {
  text: '',
  name: 'Jane Doe',
  title: 'Frontend Engineer',
  email: 'jane@example.com',
  phone: '+1 555-0100',
  location: 'Austin, TX',
  summary: '5 years of frontend experience.\nFocused on performance.',
  experience:
    'Acme Studio | Senior Engineer | 2022 - Present | Led web perf initiative\nBeta Inc | Engineer | 2020 - 2022 |',
  education: 'B.S. Computer Science, UT Austin',
  skills: 'TypeScript, React, Node.js',
}

const extraInputs: readonly ExtraInputDef[] = [
  { key: 'name', label: '姓名（必填）', rows: 1 },
  { key: 'title', label: '求职意向', rows: 1 },
  { key: 'email', label: '邮箱', rows: 1 },
  { key: 'phone', label: '电话', rows: 1 },
  { key: 'location', label: '城市', rows: 1 },
  { key: 'summary', label: '个人简介', rows: 3 },
  { key: 'experience', label: '工作经历（每行"公司 | 职位 | 时间段 | 描述"）', rows: 4 },
  { key: 'education', label: '教育背景', rows: 2 },
  { key: 'skills', label: '技能', rows: 2 },
]

const INITIAL_INPUT: ResumeInput = {
  text: '',
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  experience: '',
  education: '',
  skills: '',
}

/** 复制/下载用的纯文本：能组装成简历就用排版版，失败则退回姓名字段 */
function resumeText(input: ResumeInput): string {
  try {
    return toPlainText(buildResumeData(input))
  } catch {
    return input.name
  }
}

export default function Tool() {
  const [pdf, setPdf] = useState<PdfResult | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  /** 生成 PDF 并触发浏览器下载：二进制走 Blob，不经过模板的文本下载通道 */
  async function exportPdf(input: ResumeInput): Promise<void> {
    setWorking(true)
    setError('')
    try {
      const result = await buildPdf(input)
      setPdf(result)
      const bytes = new Uint8Array(result.bytes) // 精确拷贝，保证 .buffer 可安全传给 Blob
      const blob = new Blob([bytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${meta.slug}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdf(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  function renderOutput(input: ResumeInput) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <button
            type="button"
            data-testid="export-pdf"
            className={SECONDARY_BUTTON}
            disabled={working}
            onClick={() => void exportPdf(input)}
          >
            {working ? '生成中…' : '生成并下载 PDF'}
          </button>
        </div>
        {error === '' ? null : (
          <p
            role="alert"
            data-testid="export-error"
            className="text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {pdf === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            姓名必填；经历每行格式为「公司 | 职位 | 时间段 | 描述」（英文竖线）；含中文会报错。
          </p>
        ) : (
          <p data-testid="pdf-info" className="text-sm text-slate-600 dark:text-slate-300">
            已生成 PDF：{pdf.pages} 页，{(pdf.bytes.length / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
    )
  }

  return (
    <MultiPanel<ResumeInput, Record<string, never>>
      meta={meta}
      initialInput={INITIAL_INPUT}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={resumeText}
      downloadExt="txt"
    />
  )
}
