import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import {
  buildBreadcrumbHtml,
  buildBreadcrumbJsonLd,
  parseBreadcrumbItems,
  validateBreadcrumb,
} from './utils'
import type { BreadcrumbInput, BreadcrumbOptions } from './schema'

const EXAMPLE: BreadcrumbInput = {
  text: ['首页 || https://example.com/', '产品 || https://example.com/products', '智能手机'].join(
    '\n',
  ),
}

const LEVEL_STYLE: Record<string, string> = {
  error: 'text-red-700 dark:text-red-300',
  warning: 'text-amber-800 dark:text-amber-300',
  info: 'text-sky-800 dark:text-sky-300',
}

const LEVEL_MARK: Record<string, string> = { error: '❌', warning: '⚠️', info: 'ℹ️' }

/** 组合输出文本：HTML + JSON-LD script，供复制 / 下载 */
function toText(input: BreadcrumbInput): string {
  const items = parseBreadcrumbItems(input.text)
  return (
    buildBreadcrumbHtml(items) +
    '\n\n<script type="application/ld+json">\n' +
    buildBreadcrumbJsonLd(items) +
    '\n</script>'
  )
}

/** 纯本地计算，无网络请求 */
export default function Tool() {
  return (
    <MultiPanel<BreadcrumbInput, BreadcrumbOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={(input) => {
        let body: React.ReactNode
        try {
          if (input.text.trim() === '') {
            body = <p className="text-slate-500">在左侧输入面包屑层级（每行「名称 || URL」），预览与代码实时显示</p>
          } else {
            const items = parseBreadcrumbItems(input.text)
            const issues = validateBreadcrumb(items)
            const html = buildBreadcrumbHtml(items)
            const jsonLd = buildBreadcrumbJsonLd(items)
            body = (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">预览</p>
                  <nav aria-label="面包屑预览">
                    <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                      {items.map((item, i) => (
                        <li key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-slate-400">/</span>}
                          {item.url !== '' && i < items.length - 1 ? (
                            <a href={item.url} className="text-sky-700 underline dark:text-sky-400">
                              {item.name === '' ? '（未命名）' : item.name}
                            </a>
                          ) : (
                            <span aria-current={i === items.length - 1 ? 'page' : undefined}>
                              {item.name === '' ? '（未命名）' : item.name}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </nav>
                </div>
                {issues.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {issues.map((issue, i) => (
                      <li key={i} className={`text-sm ${LEVEL_STYLE[issue.level]}`}>
                        {LEVEL_MARK[issue.level]} {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">HTML</p>
                  <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950">
                    {html}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">JSON-LD</p>
                  <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950">
                    {jsonLd}
                  </pre>
                </div>
              </div>
            )
          }
        } catch (err) {
          body = (
            <div role="alert" data-testid="error" className="text-sm text-red-700 dark:text-red-300">
              {err instanceof Error ? err.message : '生成失败'}
            </div>
          )
        }
        return body
      }}
      toText={(input) => {
        try {
          if (input.text.trim() === '') return ''
          return toText(input)
        } catch {
          return ''
        }
      }}
      downloadExt="html"
    />
  )
}
