import { z } from 'zod'

/** 输入契约：转换走左下文件入口，text 框仅作占位（Tool.tsx 的 runAsync 会给出引导） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：文档内嵌图片忽略或转 data URI 嵌入 */
export const optionsSchema = z.object({
  imageMode: z.union([z.literal('ignore'), z.literal('embed')]),
})

export type WordToHtmlInput = z.infer<typeof inputSchema>
export type WordToHtmlOptions = z.infer<typeof optionsSchema>
