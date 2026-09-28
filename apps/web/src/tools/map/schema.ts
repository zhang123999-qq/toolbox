import { z } from 'zod'

/** 输入契约：text=地区数值（每行 地区名:数值），留空用示例 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  kind: z.string().max(10, '地图取值过长'),
  title: z.string().max(60, '标题取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
})

export type MapInput = z.infer<typeof inputSchema>
export type MapOptions = z.infer<typeof optionsSchema>
