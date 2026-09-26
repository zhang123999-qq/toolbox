import { z } from 'zod'

/** 输入契约：CIDR 串，如 192.168.1.0/24 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type CidrInput = z.infer<typeof inputSchema>
export type CidrOptions = z.infer<typeof optionsSchema>
