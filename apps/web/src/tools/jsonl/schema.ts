import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约：mode 决定转换方向；skipEmpty 决定空行是跳过还是当错误处理 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('jsonl2json'), z.literal('json2jsonl'), z.literal('validate')]),
  skipEmpty: z.boolean(),
})

export type JsonlInput = z.infer<typeof inputSchema>
export type JsonlOptions = z.infer<typeof optionsSchema>
