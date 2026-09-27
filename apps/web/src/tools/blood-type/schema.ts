import { z } from 'zod'

/** 输入字符上限（与 utils 的具名常量保持一致） */
export const INPUT_MAX_CHARS = 200000

/** 输入契约：text=受血者血型（如 A+、O-、AB；Rh 可省略） */
export const inputSchema = z.object({
  text: z.string().max(INPUT_MAX_CHARS, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type BloodTypeInput = z.infer<typeof inputSchema>
export type BloodTypeOptions = z.infer<typeof optionsSchema>
