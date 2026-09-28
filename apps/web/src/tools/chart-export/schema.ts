import { z } from 'zod'

/**
 * 输入契约：text=echarts option JSON（留空用示例）。
 * 选项契约：width/height=导出尺寸、bgColor=背景色、format=png/svg；
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
  bgColor: z.string().max(20, '背景色取值过长'),
  format: z.string().max(10, '导出格式取值过长'),
})

export type ChartExportInput = z.infer<typeof inputSchema>
export type ChartExportOptions = z.infer<typeof optionsSchema>
