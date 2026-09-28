import { z } from 'zod'
import { DIALECTS } from './utils'

/** 输入契约：自然语言需求描述 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：SQL 方言（下拉框传字符串） */
export const optionsSchema = z.object({
  dialect: z.enum(DIALECTS, { error: '方言不在候选项内' }),
})

/** BYOK 配置契约 */
export const configSchema = z.object({
  baseURL: z
    .string({ error: '接口地址必须是字符串' })
    .trim()
    .min(1, { error: '接口地址不能为空' })
    .refine((v) => /^https?:\/\//i.test(v), { error: '接口地址必须以 http:// 或 https:// 开头' }),
  model: z.string({ error: '模型名必须是字符串' }).trim().min(1, { error: '模型名不能为空' }),
  apiKey: z.string({ error: 'API Key 必须是字符串' }).trim().min(1, { error: 'API Key 不能为空' }),
})

export type SqlGenInput = z.infer<typeof inputSchema>
export type SqlGenOptions = z.infer<typeof optionsSchema>
export type SqlGenConfig = z.infer<typeof configSchema>

/** 组件内表单状态：文本框的值都是字符串 */
export interface SqlGenForm {
  baseURL: string
  model: string
  apiKey: string
}
