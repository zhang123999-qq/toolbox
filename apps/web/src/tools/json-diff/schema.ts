import { z } from 'zod'

/**
 * 输入契约：两份并列的 JSON 文本。
 * 上限比纯文本 Diff 低一些——字符级 diff 的代价随长度超线性增长。
 */
export const inputSchema = z.object({
  text: z.string().max(500_000, '输入超过 500,000 字符上限'),
  textB: z.string().max(500_000, '对比文本超过 500,000 字符上限'),
})

/** 选项契约：对比粒度 + 是否先按键名归一化（消除键顺序噪音） */
export const optionsSchema = z.object({
  mode: z.union([z.literal('line'), z.literal('char')]),
  sortKeys: z.boolean(),
})

export type JsonDiffInput = z.infer<typeof inputSchema>
export type JsonDiffOptions = z.infer<typeof optionsSchema>
