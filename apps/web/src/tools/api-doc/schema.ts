import { z } from 'zod'

/** 主输入：接口定义 JSON（单个对象或数组） */
export const inputSchema = z.object({
  text: z.string().max(200000, '接口定义超过 200000 字符上限'),
})

/** 附加输入：文档标题 / 版本 */
export const extraSchema = z.object({
  title: z.string().max(200, '标题超过 200 字符上限'),
  version: z.string().max(50, '版本超过 50 字符上限'),
})

export type ApiDocInput = z.infer<typeof inputSchema>
export type ApiDocExtra = z.infer<typeof extraSchema>
