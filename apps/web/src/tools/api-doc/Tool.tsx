import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ApiDocInput } from './schema'
import { EXAMPLE_API_DEFS_JSON, generateApiDoc, parseApiDefs } from './utils'

const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900'

export default function Tool() {
  const [title, setTitle] = useState('用户服务 API 文档')
  const [version, setVersion] = useState('v1.0')
  const [markdown, setMarkdown] = useState('')
  const [error, setError] = useState('')

  function handleGenerate(input: ApiDocInput): void {
    setError('')
    try {
      const defs = parseApiDefs(input.text)
      setMarkdown(generateApiDoc(defs, { title, version }))
    } catch (err) {
      setMarkdown('')
      setError(err instanceof Error ? err.message : '生成失败')
    }
  }

  return (
    <MultiPanel<ApiDocInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_API_DEFS_JSON }}
      initialOptions={{}}
      example={{ text: EXAMPLE_API_DEFS_JSON }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">文档标题</span>
              <input
                data-testid="apidoc-title"
                className={INPUT_CLS}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">版本</span>
              <input
                data-testid="apidoc-version"
                className={INPUT_CLS}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            data-testid="apidoc-generate"
            onClick={() => handleGenerate(input)}
            className="w-fit rounded bg-blue-600 px-4 py-1.5 text-sm text-white dark:bg-blue-500"
          >
            生成文档
          </button>
          {error !== '' && (
            <p data-testid="apidoc-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {markdown !== '' && (
            <pre
              data-testid="apidoc-result"
              className="max-h-96 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs dark:bg-slate-900"
            >
              {markdown}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：主输入为接口定义 JSON（单个对象或数组）；与 openapi-preview
            不同，本工具从表单化定义直接生成 Markdown 文档。
          </p>
        </div>
      )}
      toText={() => markdown}
    />
  )
}
