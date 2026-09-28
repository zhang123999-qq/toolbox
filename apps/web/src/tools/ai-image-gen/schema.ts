import { z } from 'zod'
import { IMAGE_SIZES } from './utils'

/** 输入契约：图像描述 */
export const inputSchema = z.object({
  text: z.string(),
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

/** 选项契约：生成尺寸 */
export const optionsSchema = z.object({
  size: z.enum(IMAGE_SIZES, { error: '尺寸不在支持列表内' }),
})

export type AiImageGenInput = z.infer<typeof inputSchema>
export type AiImageGenConfig = z.infer<typeof configSchema>
export type AiImageGenOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串 */
export interface ImageGenForm {
  baseURL: string
  model: string
  apiKey: string
}
