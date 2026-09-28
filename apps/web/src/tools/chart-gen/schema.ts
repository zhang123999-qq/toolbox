import { z } from 'zod'

/** 输入契约：text=CSV 图表数据（第一行表头，后续行数据），留空用示例 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  type: z.string().max(20, '图表类型取值过长'),
  title: z.string().max(60, '标题取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
})

export type ChartGenInput = z.infer<typeof inputSchema>
export type ChartGenOptions = z.infer<typeof optionsSchema>
