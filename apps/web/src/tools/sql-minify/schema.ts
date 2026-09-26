import { z } from 'zod'

/** 输入契约：限制长度，避免超长 SQL 卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 选项契约：压缩无开关，留空对象保证输入/输出契约结构一致 */
export const optionsSchema = z.object({})

export type SqlMinifyInput = z.infer<typeof inputSchema>
export type SqlMinifyOptions = z.infer<typeof optionsSchema>
