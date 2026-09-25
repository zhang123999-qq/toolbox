import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本让主线程长时间忙碌 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：uppercase 控制十六进制大小写，format 控制摘要的输出编码 */
export const optionsSchema = z.object({
  uppercase: z.boolean(),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type Md5Input = z.infer<typeof inputSchema>
export type Md5Options = z.infer<typeof optionsSchema>
