import { z } from 'zod'

/** 输入契约：text=旧版代码，textB=新版代码 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：对比粒度 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('line'), z.literal('char')]),
})

export type CodeDiffInput = z.infer<typeof inputSchema>
export type CodeDiffOptions = z.infer<typeof optionsSchema>
