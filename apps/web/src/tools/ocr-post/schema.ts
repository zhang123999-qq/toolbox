import { z } from 'zod'

/** 输入契约：OCR 识别出的原始文本 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：四条规则的开关 */
export const optionsSchema = z.object({
  confusables: z.boolean({ error: '形近字规则开关非法' }),
  spaces: z.boolean({ error: '空白规则开关非法' }),
  lineBreaks: z.boolean({ error: '换行规则开关非法' }),
  width: z.boolean({ error: '全半角规则开关非法' }),
})

export type OcrPostInput = z.infer<typeof inputSchema>
export type OcrPostOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态（与 MultiPanel 选项键一致） */
export type OcrPostFormOptions = OcrPostOptions
