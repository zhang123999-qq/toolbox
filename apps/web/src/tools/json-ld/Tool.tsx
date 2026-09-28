import { useState } from 'react'
import { meta } from './meta'
import { buildJsonLd } from './utils'
import type { JsonLdFieldKey } from './schema'
import type { JsonLdType } from './utils'

const TYPES: readonly JsonLdType[] = [
  'Article',
  'Product',
  'FAQPage',
  'BreadcrumbList',
  'Organization',
]

/** 每种类型展示的字段：key / 标签 / 是否多行 / 占位 */
const FIELDS: Record<
  JsonLdType,
  ReadonlyArray<{ key: JsonLdFieldKey; label: string; textarea?: boolean; placeholder: string }>
> = {
  Article: [
    { key: 'headline', label: 'headline（标题）*', placeholder: '文章标题' },
    { key: 'description', label: 'description', textarea: true, placeholder: '一句话摘要' },
    { key: 'author', label: 'author（作者）', placeholder: '张三' },
    { key: 'datePublished', label: 'datePublished', placeholder: '2026-09-28' },
    { key: 'image', label: 'image（配图 URL）', placeholder: 'https://example.com/cover.png' },
    { key: 'url', label: 'url（ canonical URL）', placeholder: 'https://example.com/post' },
  ],
  Product: [
    { key: 'name', label: 'name（商品名）*', placeholder: '无线蓝牙耳机' },
    { key: 'description', label: 'description', textarea: true, placeholder: '商品卖点描述' },
    { key: 'brand', label: 'brand（品牌）', placeholder: '某品牌' },
    { key: 'price', label: 'price（价格）', placeholder: '1999' },
    { key: 'priceCurrency', label: 'priceCurrency（货币）', placeholder: 'CNY' },
    { key: 'image', label: 'image（商品图 URL）', placeholder: 'https://example.com/p.png' },
    { key: 'url', label: 'url（商品页 URL）', placeholder: 'https://example.com/p' },
  ],
  FAQPage: [
    {
      key: 'questions',
      label: '问答列表 *（每行「问题 || 答案」）',
      textarea: true,
      placeholder: '支持退货吗 || 支持7天无理由\n运费谁承担 || 卖家承担',
    },
  ],
  BreadcrumbList: [
    {
      key: 'breadcrumbs',
      label: '面包屑 *（每行「名称 || URL」）',
      textarea: true,
      placeholder: '首页 || https://example.com/\n分类 || https://example.com/c',
    },
  ],
  Organization: [
    { key: 'name', label: 'name（组织名）*', placeholder: '某某科技有限公司' },
    { key: 'url', label: 'url（官网）', placeholder: 'https://example.com' },
    { key: 'logo', label: 'logo（URL）', placeholder: 'https://example.com/logo.png' },
    { key: 'description', label: 'description', textarea: true, placeholder: '公司简介' },
    {
      key: 'sameAs',
      label: 'sameAs（每行一个社交主页 URL）',
      textarea: true,
      placeholder: 'https://weibo.com/xxx',
    },
  ],
}

const EXAMPLE_FIELDS: Record<JsonLdType, Record<string, string>> = {
  Article: {
    headline: '如何做好 SEO：从零开始的完整指南',
    author: '张三',
    datePublished: '2026-09-28',
  },
  Product: { name: '无线蓝牙耳机', brand: '某品牌', price: '199', priceCurrency: 'CNY' },
  FAQPage: { questions: '支持退货吗 || 支持7天无理由退货\n运费谁承担 || 卖家承担运费' },
  BreadcrumbList: { breadcrumbs: '首页 || https://example.com/\n博客 || https://example.com/blog' },
  Organization: {
    name: '某某科技有限公司',
    url: 'https://example.com',
    sameAs: 'https://weibo.com/xxx',
  },
}

const INPUT_CLASS =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'
const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/ld+json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function Tool() {
  const [type, setType] = useState<JsonLdType>('Article')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const setField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const run = (t: JsonLdType, f: Record<string, string>) => {
    try {
      setOutput(buildJsonLd(t, f))
      setError('')
    } catch (e) {
      setOutput('')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {meta.description}（{meta.titleEn}）
      </p>

      <div>
        <label className={LABEL_CLASS} htmlFor="jsonld-type">
          结构化数据类型
        </label>
        <select
          id="jsonld-type"
          data-testid="type-select"
          className={INPUT_CLASS}
          value={type}
          onChange={(e) => {
            const t = e.target.value as JsonLdType
            setType(t)
            setFields({})
            setOutput('')
            setError('')
          }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div data-testid="input" className="flex flex-col gap-3">
        {FIELDS[type].map((fd) => (
          <div key={fd.key}>
            <label className={LABEL_CLASS} htmlFor={`jsonld-${fd.key}`}>
              {fd.label}
            </label>
            {fd.textarea ? (
              <textarea
                id={`jsonld-${fd.key}`}
                data-testid={`field-${fd.key}`}
                className={INPUT_CLASS + ' min-h-24 font-mono'}
                placeholder={fd.placeholder}
                value={fields[fd.key] ?? ''}
                onChange={(e) => setField(fd.key, e.target.value)}
              />
            ) : (
              <input
                id={`jsonld-${fd.key}`}
                data-testid={`field-${fd.key}`}
                className={INPUT_CLASS}
                placeholder={fd.placeholder}
                value={fields[fd.key] ?? ''}
                onChange={(e) => setField(fd.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="run"
          className={BTN_CLASS}
          onClick={() => run(type, fields)}
        >
          生成
        </button>
        <button
          type="button"
          data-testid="example"
          className={BTN_CLASS}
          onClick={() => {
            const ex = EXAMPLE_FIELDS[type]
            setFields(ex)
            run(type, ex)
          }}
        >
          示例
        </button>
        <button
          type="button"
          data-testid="clear"
          className={BTN_CLASS}
          onClick={() => {
            setFields({})
            setOutput('')
            setError('')
          }}
        >
          清空
        </button>
      </div>

      {error !== '' && (
        <p
          role="alert"
          data-testid="output"
          className="rounded border border-red-200 bg-red-50 p-3 font-mono text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {error === '' && output !== '' && (
        <div className="flex flex-col gap-2">
          <pre
            data-testid="output"
            className="overflow-auto rounded border border-slate-200 bg-slate-50 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {output}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="copy"
              className={BTN_CLASS}
              onClick={() => {
                void copyText(output).then((ok) => {
                  setCopied(ok)
                  if (ok) setTimeout(() => setCopied(false), 1500)
                })
              }}
            >
              {copied ? '已复制' : '复制'}
            </button>
            <button
              type="button"
              data-testid="download"
              className={BTN_CLASS}
              onClick={() => downloadText('json-ld.html', output)}
            >
              下载
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
