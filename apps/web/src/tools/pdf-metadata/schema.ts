import { z } from 'zod'

/**
 * 元数据编辑表单契约：四个可编辑字段均为文本字符串；
 * 长度上限防止异常输入撑爆 Info 字典（与界面输入框的约束一致）。
 */
export const metadataFormSchema = z.object({
  title: z.string().max(500, '标题过长（上限 500 字符）'),
  author: z.string().max(200, '作者过长（上限 200 字符）'),
  subject: z.string().max(500, '主题过长（上限 500 字符）'),
  keywords: z.string().max(1000, '关键字过长（上限 1000 字符）'),
})

export type PdfMetadataForm = z.infer<typeof metadataFormSchema>
