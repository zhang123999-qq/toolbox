import { z } from 'zod'

/** 主输入：manifest.json 内容 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200000 字符上限'),
})

export type ExtensionDebugToolInput = z.infer<typeof inputSchema>
