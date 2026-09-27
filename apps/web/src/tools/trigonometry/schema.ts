import { z } from 'zod'

/** 输入契约：text=角度数值 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：角度单位 */
export const optionsSchema = z.object({
  unit: z.union([z.literal('deg'), z.literal('rad')]),
})

export type TrigonometryInput = z.infer<typeof inputSchema>
export type TrigonometryOptions = z.infer<typeof optionsSchema>
