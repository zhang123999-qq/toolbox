import { z } from 'zod'

/** 主输入：文件清单 JSON */
export const inputSchema = z.object({
  text: z.string().max(500000, '输入超过 500000 字符上限'),
})

export type ExtensionPackToolInput = z.infer<typeof inputSchema>
