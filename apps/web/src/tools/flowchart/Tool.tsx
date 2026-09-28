import { useEffect, useId, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { EXAMPLES, MAX_CODE_LENGTH, prepareCode, validate } from './utils'
import type { FlowchartInput, FlowchartOptions } from './schema'

/** 「示例」按钮填入的示例：带判断的流程 */
const EXAMPLE: FlowchartInput = { text: EXAMPLES[0] }

/** 截断提示条样式 */
const NOTICE_CLASS =
  'mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'

/** 错误提示样式 */
const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

/** 引导 / 加载中提示样式 */
const HINT_CLASS = 'text-sm text-slate-500 dark:text-slate-400'

/** mermaid 体积大，动态导入使其独立分包；模块缓存保证只初始化一次 */
let mermaidReady = false

async function renderDiagram(code: string, elementId: string): Promise<string> {
  const mermaid = (await import('mermaid')).default
  if (!mermaidReady) {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
    mermaidReady = true
  }
  const { svg } = await mermaid.render(elementId, code)
  return svg
}

type RenderStatus = 'rendering' | 'failed' | 'ok'

interface RenderState {
  readonly code: string
  readonly status: RenderStatus
  readonly svg: string
}

interface DiagramPreviewProps {
  readonly code: string
  readonly invalidMessage: string | null
}

/** 右侧预览区：mermaid.render 需要 DOM，只能在组件里调用 */
function DiagramPreview({ code, invalidMessage }: DiagramPreviewProps) {
  const uid = useId()
  const [render, setRender] = useState<RenderState>({ code, status: 'rendering', svg: '' })
  if (render.code !== code) {
    setRender({ code, status: 'rendering', svg: '' })
  }

  useEffect(() => {
    if (invalidMessage !== null || code === '') return
    let cancelled = false
    const elementId = 'mermaid-' + uid.replace(/[^a-zA-Z0-9]/g, '')
    renderDiagram(code, elementId).then(
      (svg) => {
        if (!cancelled) setRender({ code, status: 'ok', svg })
      },
      () => {
        if (!cancelled) setRender({ code, status: 'failed', svg: '' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [code, invalidMessage, uid])

  if (invalidMessage !== null) {
    return (
      <p role="alert" data-testid="preview-error" className={ERROR_CLASS}>
        {invalidMessage}
      </p>
    )
  }
  if (render.status === 'failed') {
    return (
      <p role="alert" data-testid="preview-error" className={ERROR_CLASS}>
        流程图渲染失败，请检查 Mermaid 语法
      </p>
    )
  }
  if (code === '') {
    return <p className={HINT_CLASS}>在左侧输入 Mermaid flowchart 代码，右侧实时预览</p>
  }
  if (render.status === 'rendering') {
    return <p className={HINT_CLASS}>渲染中…</p>
  }
  return (
    <div
      data-testid="preview-svg"
      className="overflow-auto"
      dangerouslySetInnerHTML={{ __html: render.svg }}
    />
  )
}

/** unknown → 可展示的错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

interface ResolvedPreview {
  readonly code: string
  readonly truncated: boolean
  readonly invalidMessage: string | null
}

/** 把输入解析成预览所需的三元组：任何异常都收敛为 invalidMessage */
function resolvePreview(raw: string, options: FlowchartOptions): ResolvedPreview {
  try {
    const prepared = prepareCode(raw, options)
    if (prepared.code === '') {
      return { code: '', truncated: false, invalidMessage: null }
    }
    try {
      validate(prepared.code)
    } catch (error) {
      return {
        code: prepared.code,
        truncated: prepared.truncated,
        invalidMessage: messageOf(error),
      }
    }
    return { code: prepared.code, truncated: prepared.truncated, invalidMessage: null }
  } catch (error) {
    return { code: '', truncated: false, invalidMessage: messageOf(error) }
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<FlowchartOptions>[] = [
    { key: 'direction', label: '方向', kind: 'select', values: ['TB', 'LR'] },
  ]

  return (
    <MultiPanel<FlowchartInput, FlowchartOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'TB' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => {
        const resolved = resolvePreview(input.text, options)
        return (
          <div>
            {resolved.truncated ? (
              <p data-testid="preview-truncated" className={NOTICE_CLASS}>
                代码超过 {MAX_CODE_LENGTH} 字符，已截断
              </p>
            ) : null}
            <DiagramPreview code={resolved.code} invalidMessage={resolved.invalidMessage} />
          </div>
        )
      }}
      toText={(input, options) => {
        try {
          return prepareCode(input.text, options).code
        } catch {
          return ''
        }
      }}
      downloadExt="mmd"
    />
  )
}
