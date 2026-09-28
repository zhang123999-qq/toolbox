import { z } from 'zod'

/** 输入契约：待优化的粗糙提示词 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：BYOK 三件套。baseURL 只做非空与 http(s) 校验，
 * 具体拼接由 utils.chatCompletionsUrl 完成；Key 在此只校验非空，
 * 绝不打印、不落盘除用户显式勾选的 localStorage。
 */
export const optionsSchema = z.object({
  baseURL: z
    .string({ error: '接口地址必须是字符串' })
    .trim()
    .min(1, { error: '接口地址不能为空' })
    .refine((v) => /^https?:\/\//i.test(v), { error: '接口地址必须以 http:// 或 https:// 开头' }),
  model: z.string({ error: '模型名必须是字符串' }).trim().min(1, { error: '模型名不能为空' }),
  apiKey: z.string({ error: 'API Key 必须是字符串' }).trim().min(1, { error: 'API Key 不能为空' }),
})

export type PromptOptimizeInput = z.infer<typeof inputSchema>
export type PromptOptimizeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串 */
export interface PromptOptimizeFormOptions {
  baseURL: string
  model: string
}
