import { z } from 'zod'

/** 输入契约：文件走左下的文件入口；text 保留占位 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：topN 展示几个候选；preview 是否给出解码预览 */
export const optionsSchema = z.object({
  topN: z.number().int().min(1).max(10),
  preview: z.boolean(),
})

export type FileEncodingInput = z.infer<typeof inputSchema>
export type FileEncodingOptions = z.infer<typeof optionsSchema>
