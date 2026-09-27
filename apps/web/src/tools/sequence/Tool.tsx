import { useEffect, useId, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import type { Translate } from '../../i18n'
import { meta } from './meta'
import { EXAMPLES, MAX_CODE_LENGTH, prepareCode, validateDiagram } from './utils'
import type { SequenceInput, SequenceOptions } from './schema'

/** 「示例」按钮填入的示例：登录时序 */
const EXAMPLE: SequenceInput = { text: EXAMPLES[0] }

/** 截断提示条样式 */
const NOTICE_CLASS =
  'mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'

/** 错误提示样式 */
const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

/** 引导 / 加载中提示样式 */
const HINT_CLASS = 'text-sm text-slate-500 dark:text-slate-400'

/**
 * mermaid 体积大（数百 KB），动态导入使其独立分包，
 * 工具主 chunk 保持在 30KB 预算内；模块缓存保证只初始化一次。
 */
let mermaidReady = false

async function renderDiagram(code: string, elementId: string): Promise<string> {
  const mermaid = (await import('mermaid')).default
  if (!mermaidReady) {
    // startOnLoad 关掉，避免 mermaid 扫描整页；strict 安全级别过滤注入
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
    mermaidReady = true
  }
  const { svg } = await mermaid.render(elementId, code)
  return svg
}

type RenderStatus = 'rendering' | 'failed' | 'ok'

interface RenderState {
  /** 渲染结果对应的代码快照：code 变化时在 render 阶段重置 */
  readonly code: string
  readonly status: RenderStatus
  /** ok 时的 SVG 字符串 */
  readonly svg: string
}

interface DiagramPreviewProps {
  readonly code: string
  /** 非空表示 utils 层校验未通过，直接展示该信息，不调 mermaid */
  readonly invalidMessage: string | null
  readonly t: Translate
}

/**
 * 右侧预览区：mermaid.render 需要 DOM，只能在组件里调用。
 * 同步分支（invalid/empty）在 render 阶段直接派生，不走 effect，避免级联渲染；
 * effect 只处理异步渲染：rendering → ok / failed。
 */
function DiagramPreview({ code, invalidMessage, t }: DiagramPreviewProps) {
  const uid = useId()
  // 渲染结果与 code 绑定：code 变化时在 render 阶段重置（React 官方推荐的派生 state 模式），
  // effect 内不再做任何同步 setState，避免级联渲染
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
        {t('mermaid.error.renderFailed')}
      </p>
    )
  }
  if (code === '') {
    return <p className={HINT_CLASS}>{t('sequence.preview.empty')}</p>
  }
  if (render.status === 'rendering') {
    return <p className={HINT_CLASS}>{t('sequence.preview.rendering')}</p>
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

/** 把输入解析成预览所需的三元组：任何异常都收敛为 invalidMessage，不向上传播 */
function resolvePreview(raw: string, t: Translate): ResolvedPreview {
  try {
    const prepared = prepareCode(raw)
    // 空输入走引导态，不视为校验错误（与 README「边界」一致）
    if (prepared.code === '') {
      return { code: '', truncated: false, invalidMessage: null }
    }
    try {
      validateDiagram(prepared.code, t)
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
  const t = useTranslate()
  return (
    <MultiPanel<SequenceInput, SequenceOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={(input) => {
        const resolved = resolvePreview(input.text, t)
        return (
          <div>
            {resolved.truncated ? (
              <p data-testid="preview-truncated" className={NOTICE_CLASS}>
                {t('mermaid.notice.truncated', { max: MAX_CODE_LENGTH })}
              </p>
            ) : null}
            <DiagramPreview code={resolved.code} invalidMessage={resolved.invalidMessage} t={t} />
          </div>
        )
      }}
      toText={(input) => {
        try {
          return prepareCode(input.text).code
        } catch {
          return ''
        }
      }}
      downloadExt="mmd"
    />
  )
}
