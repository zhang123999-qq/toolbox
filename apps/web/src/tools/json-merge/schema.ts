import { z } from 'zod'

/** 输入契约：text 为基础 JSON，textB 为待并入的 JSON */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
  textB: z.string().max(1_000_000, '待合并文本超过 1,000,000 字符上限'),
})

/**
 * 选项契约：
 * mode 决定往下合并多少层，prefer 决定两边都有值且类型合不上时听谁的。
 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('deep'), z.literal('shallow')]),
  prefer: z.union([z.literal('override'), z.literal('base')]),
})

export type JsonMergeInput = z.infer<typeof inputSchema>
export type JsonMergeOptions = z.infer<typeof optionsSchema>
