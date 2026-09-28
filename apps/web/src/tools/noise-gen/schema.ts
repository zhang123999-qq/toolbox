import { z } from 'zod'

/** 输入契约：text=种子数字（可选，留空随机） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  scale: z.string().max(10, '尺度取值过长'),
  octaves: z.string().max(10, '八度取值过长'),
  seed: z.string().max(10, '种子取值过长'),
  colormap: z.string().max(20, '颜色映射取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
})

export type NoiseGenInput = z.infer<typeof inputSchema>
export type NoiseGenOptions = z.infer<typeof optionsSchema>
