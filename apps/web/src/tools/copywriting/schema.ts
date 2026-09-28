import { z } from 'zod'
import { COPY_TYPES, TONES } from './utils'

/** 输入契约：产品描述 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：文案类型 + 语气（下拉框传字符串） */
export const optionsSchema = z.object({
  copyType: z.enum(COPY_TYPES, { error: '文案类型不在候选项内' }),
  tone: z.enum(TONES, { error: '语气不在候选项内' }),
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

export type CopywritingInput = z.infer<typeof inputSchema>
export type CopywritingOptions = z.infer<typeof optionsSchema>
export type CopywritingConfig = z.infer<typeof configSchema>

/** 组件内表单状态：文本框的值都是字符串 */
export interface CopywritingForm {
  baseURL: string
  model: string
  apiKey: string
}
