import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { PromptTemplateFormOptions, PromptTemplateInput } from './schema'
import {
  extractVariables,
  fillTemplate,
  getTemplate,
  missingVariables,
  PROMPT_TEMPLATES,
} from './utils'

function toChineseError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
  return err instanceof Error ? err.message : '处理失败，请重试'
}

export default function Tool() {
  const [templateId, setTemplateId] = useState('translate')
  const [values, setValues] = useState<Record<string, string>>({})

  function setVar(name: string, value: string): void {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function clearVars(): void {
    setValues({})
  }

  /** 计算渲染结果：renderOutput 与 toText 共用（纯函数，不写 state） */
  function renderedText(input: PromptTemplateInput): { text: string; loadError: string } {
    const custom = input.text.trim()
    try {
      const template = custom === '' ? getTemplate(templateId).template : custom
      return { text: fillTemplate(template, values), loadError: '' }
    } catch (err) {
      return { text: '', loadError: toChineseError(err) }
    }
  }

  return (
    <MultiPanel<PromptTemplateInput, PromptTemplateFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ templateId: 'translate' }}
      renderOutput={(input) => {
        const { text: preview, loadError } = renderedText(input)
        const custom = input.text.trim()
        let active: { name: string; template: string; description: string } | null = null
        let vars: string[] = []
        try {
          const tpl =
            custom === ''
              ? getTemplate(templateId)
              : {
                  name: '自定义模板',
                  description: '左侧输入的自定义模板',
                  template: custom,
                }
          active = { name: tpl.name, template: tpl.template, description: tpl.description }
          vars = extractVariables(tpl.template)
        } catch {
          /* loadError 已由 renderedText 给出 */
        }

        const missing = active ? missingVariables(active.template, values) : []

        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-sm">
                选择模板
                <select
                  data-testid="template-select"
                  className="rounded border border-slate-300 px-1 py-1 dark:border-slate-700 dark:bg-slate-900"
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value)
                    clearVars()
                  }}
                  disabled={custom !== ''}
                >
                  {PROMPT_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}：{t.description}
                    </option>
                  ))}
                </select>
              </label>
              {custom !== '' ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  左侧填写了自定义模板，优先使用左侧模板
                </span>
              ) : null}
              <button
                type="button"
                data-testid="clear-vars"
                className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                onClick={clearVars}
              >
                清空变量
              </button>
            </div>

            {loadError ? (
              <div
                role="alert"
                data-testid="error"
                className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                {loadError}
              </div>
            ) : null}

            {active && vars.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500">
                  当前模板：{active.name}（{active.description}），请填写以下变量：
                </p>
                {vars.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0 font-mono text-slate-600 dark:text-slate-400">
                      {`{{${name}}}`}
                    </span>
                    <input
                      type="text"
                      data-testid={`var-${name}`}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                      value={values[name] ?? ''}
                      onChange={(e) => setVar(name, e.target.value)}
                      placeholder={`填写 ${name}`}
                    />
                  </label>
                ))}
                {missing.length > 0 ? (
                  <p
                    data-testid="missing-hint"
                    className="text-sm text-amber-600 dark:text-amber-400"
                  >
                    还有 {missing.length} 个变量未填写：{missing.join('、')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {active && vars.length === 0 ? (
              <p className="text-sm text-slate-500">
                当前模板没有 {`{{变量}}`} 占位符，可直接复制使用。
              </p>
            ) : null}

            {active ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500">渲染预览：</p>
                <pre
                  data-testid="preview"
                  className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {preview}
                </pre>
              </div>
            ) : null}

            <p className="text-xs text-slate-500">
              说明：也可在左侧直接写自定义模板（支持 {`{{变量}}`} 占位符）。下方「复制」按钮 /
              下载会使用渲染结果；变量未填完时占位符会原样保留。选项校验：
              {optionsSchema.safeParse({ templateId }).success ? '通过' : '模板未选择'}。
            </p>
          </div>
        )
      }}
      toText={(input) => renderedText(input).text}
      downloadExt="txt"
    />
  )
}
