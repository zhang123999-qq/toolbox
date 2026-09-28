import { z } from 'zod'

/** 输入契约：主输入框为待扫描的 CSS；生成参数在页面表单中 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type ReducedMotionInput = z.infer<typeof inputSchema>
export type ReducedMotionOptions = z.infer<typeof optionsSchema>
