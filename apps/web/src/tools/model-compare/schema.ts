import { z } from 'zod'

/** 输入契约：要对比的提示词 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 单个模型配置契约 */
const sideSchema = z.object({
  baseURL: z
    .string({ error: '接口地址必须是字符串' })
    .trim()
    .min(1, { error: '接口地址不能为空' })
    .refine((v) => /^https?:\/\//i.test(v), { error: '接口地址必须以 http:// 或 https:// 开头' }),
  model: z.string({ error: '模型名必须是字符串' }).trim().min(1, { error: '模型名不能为空' }),
  apiKey: z.string({ error: 'API Key 必须是字符串' }).trim().min(1, { error: 'API Key 不能为空' }),
})

/** 选项契约：两侧模型配置 */
export const optionsSchema = z.object({
  sideA: sideSchema,
  sideB: sideSchema,
})

export type ModelCompareInput = z.infer<typeof inputSchema>
export type ModelCompareOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串 */
export interface ModelSideForm {
  baseURL: string
  model: string
  apiKey: string
}
export interface ModelCompareFormOptions {
  sideA: ModelSideForm
  sideB: ModelSideForm
}
