import { z } from 'zod'

/** 输入契约：用户的问题 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：返回的证据句数 */
export const optionsSchema = z.object({
  topK: z.coerce.number({ error: '证据句数必须是数字' }).int({ error: '证据句数必须是整数' }),
})

export type LocalQaInput = z.infer<typeof inputSchema>
export type LocalQaOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface LocalQaFormOptions {
  topK: string
}
