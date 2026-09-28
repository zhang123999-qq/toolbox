import { z } from 'zod'

/** 输入契约：text=Mermaid flowchart 源码 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：direction=TB/LR，默认 TB */
export const optionsSchema = z.object({
  direction: z.string().max(10, '方向取值过长'),
})

export type FlowchartInput = z.infer<typeof inputSchema>
export type FlowchartOptions = z.infer<typeof optionsSchema>
