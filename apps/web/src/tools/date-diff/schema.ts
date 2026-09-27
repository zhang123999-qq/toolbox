import { z } from 'zod'

/** 输入契约：text=日期 A，textB=日期 B */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项（全部维度同时输出） */
export const optionsSchema = z.object({})

export type DateDiffInput = z.infer<typeof inputSchema>
export type DateDiffOptions = z.infer<typeof optionsSchema>
