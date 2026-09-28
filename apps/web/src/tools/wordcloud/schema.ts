import { z } from 'zod'

/**
 * 输入契约：text=待统计文本（留空用示例）。
 * 选项契约：topN=显示词数、width/height=画布尺寸、minSize/maxSize=字号区间；
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  topN: z.string().max(10, '显示词数取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
  minSize: z.string().max(10, '最小字号取值过长'),
  maxSize: z.string().max(10, '最大字号取值过长'),
})

export type WordcloudInput = z.infer<typeof inputSchema>
export type WordcloudOptions = z.infer<typeof optionsSchema>
