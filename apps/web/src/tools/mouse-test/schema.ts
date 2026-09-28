import { z } from 'zod'

/**
 * 输入契约：鼠标测试为纯交互工具，无文本输入、无选项，
 * 全部交互（点击/滚轮）在测试面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type MouseTestInput = z.infer<typeof inputSchema>
export type MouseTestOptions = z.infer<typeof optionsSchema>
