import { z } from 'zod'

/** 输入契约：text=热力图数据（每行：X类目, Y类目, 数值），留空用示例 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  title: z.string().max(60, '标题取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
})

export type HeatmapInput = z.infer<typeof inputSchema>
export type HeatmapOptions = z.infer<typeof optionsSchema>
