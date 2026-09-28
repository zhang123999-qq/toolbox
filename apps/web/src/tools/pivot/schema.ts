import { z } from 'zod'

/**
 * 输入契约：text=CSV 文本（留空用示例）；rowKey/colKey/valKey=维度与值列名（Tool 以 extraInputs 呈现）。
 * 选项契约：agg=聚合方式（下拉）；合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  rowKey: z.string().max(50, '行维度列名过长'),
  colKey: z.string().max(50, '列维度列名过长'),
  valKey: z.string().max(50, '值列名过长'),
})

export const optionsSchema = z.object({
  agg: z.string().max(10, '聚合方式取值过长'),
})

export type PivotInput = z.infer<typeof inputSchema>
export type PivotOptions = z.infer<typeof optionsSchema>
