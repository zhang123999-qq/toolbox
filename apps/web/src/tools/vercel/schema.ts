import { z } from 'zod'

/** 主输入：vercel.json 文本 */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50000 字符上限'),
})

export type VercelInput = z.infer<typeof inputSchema>

/** 选项：无（保留空对象以满足模板） */
export const optionsSchema = z.object({})

export type VercelOptions = z.infer<typeof optionsSchema>
