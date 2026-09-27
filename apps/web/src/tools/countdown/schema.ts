import { z } from 'zod'

/** 输入契约：text=目标日期时间，textB=开始日期（可选，用于算百分比） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：标题（展示用） */
export const optionsSchema = z.object({
  title: z.string(),
})

export type CountdownInput = z.infer<typeof inputSchema>
export type CountdownOptions = z.infer<typeof optionsSchema>
