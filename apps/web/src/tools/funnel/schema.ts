import { z } from 'zod'

/**
 * 输入契约：text=漏斗数据行（「阶段名:数值」，每行一个阶段），留空用示例。
 * 选项契约：title/width/height；合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  title: z.string().max(60, '标题取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
})

export type FunnelInput = z.infer<typeof inputSchema>
export type FunnelOptions = z.infer<typeof optionsSchema>
