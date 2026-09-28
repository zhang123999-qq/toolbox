import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { SkipLinkInput, SkipLinkOptions } from './schema'
import {
  DEFAULT_LABEL,
  DEFAULT_TARGET_ID,
  detectSkipLink,
  formatSkipLinkReport,
  generateSkipLink,
} from './utils'

export default function Tool() {
  const [targetId, setTargetId] = useState(DEFAULT_TARGET_ID)
  const [label, setLabel] = useState(DEFAULT_LABEL)

  function snippetOf(): { html: string; css: string; error: string } {
    try {
      const s = generateSkipLink({ targetId, label })
      return { ...s, error: '' }
    } catch (err) {
      return { html: '', css: '', error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  function detectionOf(input: SkipLinkInput): string {
    if (input.text.trim() === '') return ''
    try {
      const d = detectSkipLink(input.text)
      if (!d.found) return '未检测到跳过链接：建议添加，方便键盘用户直达主要内容。'
      return d.matches
        .map(
          (m) =>
            `检测到跳过链接："${m.text}"（${m.href}，${
              m.targetExists ? '目标存在' : '目标不存在（href 指向的 id 在文档中找不到）'
            }）`,
        )
        .join('\n')
    } catch (err) {
      return err instanceof Error ? err.message : '检测失败'
    }
  }

  return (
    <MultiPanel<SkipLinkInput, SkipLinkOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{
        text: '<body><a class="skip-link" href="#main-content">跳转到主要内容</a><main id="main-content">正文</main></body>',
      }}
      renderOutput={(input) => {
        const snippet = snippetOf()
        const detection = detectionOf(input)
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <label className="flex items-center gap-1 text-sm">
                <span className="w-20 shrink-0 text-slate-600 dark:text-slate-400">
                  跳转目标 id
                </span>
                <input
                  type="text"
                  data-testid="target-id"
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-1 text-sm">
                <span className="w-20 shrink-0 text-slate-600 dark:text-slate-400">链接文案</span>
                <input
                  type="text"
                  data-testid="link-label"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
            </div>
            {snippet.error ? (
              <div
                role="alert"
                data-testid="param-error"
                className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                {snippet.error}
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    生成的 HTML
                  </div>
                  <pre
                    data-testid="snippet-html"
                    className="whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {snippet.html}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    配套 CSS
                  </div>
                  <pre
                    data-testid="snippet-css"
                    className="whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {snippet.css}
                  </pre>
                </div>
                <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
                  <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    实时预览（按 Tab 聚焦下面的链接查看显示效果）
                  </div>
                  <style>{snippet.css}</style>
                  <a
                    data-testid="demo-skip-link"
                    className="skip-link"
                    href={`#${targetId}`}
                    // 演示用：阻止真实跳转
                    onClick={(e) => e.preventDefault()}
                  >
                    {label}
                  </a>
                </div>
              </>
            )}
            {detection ? (
              <div
                data-testid="detect-result"
                className="whitespace-pre-wrap rounded border border-slate-200 p-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                {detection}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                左侧可粘贴页面 HTML，检测是否已有跳过链接（留空则只生成代码）。
              </p>
            )}
          </div>
        )
      }}
      toText={(input) => {
        try {
          const snippet = generateSkipLink({ targetId, label })
          const detection = input.text.trim() === '' ? null : detectSkipLink(input.text)
          return formatSkipLinkReport(snippet, detection)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}
