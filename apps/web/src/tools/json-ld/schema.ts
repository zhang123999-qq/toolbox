import { z } from 'zod'

/**
 * 输入契约（#625 JSON-LD）
 * - type：结构化数据类型，Article / Product / FAQPage / BreadcrumbList / Organization
 * - fields：各类型表单字段（UI 按类型只展示相关项），均为字符串
 */
export const inputSchema = z.object({
  type: z.enum(['Article', 'Product', 'FAQPage', 'BreadcrumbList', 'Organization']),
})

const fieldSchemas = {
  headline: z.string().max(500, '标题超过 500 字符上限'),
  name: z.string().max(500, '名称超过 500 字符上限'),
  description: z.string().max(2000, '描述超过 2000 字符上限'),
  author: z.string().max(200, '作者超过 200 字符上限'),
  datePublished: z.string().max(50, '日期过长'),
  image: z.string().max(2000, '图片 URL 过长'),
  url: z.string().max(2000, 'URL 过长'),
  brand: z.string().max(200, '品牌超过 200 字符上限'),
  price: z.string().max(50, '价格过长'),
  priceCurrency: z.string().max(10, '货币代码过长'),
  questions: z.string().max(10000, '问答文本过长'),
  breadcrumbs: z.string().max(10000, '面包屑文本过长'),
  logo: z.string().max(2000, 'Logo URL 过长'),
  sameAs: z.string().max(10000, 'sameAs 文本过长'),
}

export const optionsSchema = z.object(fieldSchemas)

export type JsonLdInput = z.infer<typeof inputSchema>
export type JsonLdOptions = z.infer<typeof optionsSchema>
export type JsonLdFieldKey = keyof typeof fieldSchemas
