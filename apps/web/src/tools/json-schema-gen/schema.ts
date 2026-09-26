import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/**
 * 选项契约：format 决定 $schema 声明的草案版本；
 * strict 决定 required 取「见过的全部键」还是「每个样本都有的键」。
 */
export const optionsSchema = z.object({
  format: z.union([z.literal('draft-07'), z.literal('draft-2020-12')]),
  strict: z.boolean(),
})

export type SchemaGenInput = z.infer<typeof inputSchema>
export type SchemaGenOptions = z.infer<typeof optionsSchema>
