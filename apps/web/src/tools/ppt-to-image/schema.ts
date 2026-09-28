import { z } from 'zod'

/** 输入契约：转换走文件入口，text 框仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：输出尺寸与背景 */
export const optionsSchema = z.object({
  size: z.enum(['960x540', '1280x720', '800x600']).default('960x540'),
  background: z.enum(['white', 'dark']).default('white'),
})

export type PptToImageInput = z.infer<typeof inputSchema>
export type PptToImageOptions = z.infer<typeof optionsSchema>
