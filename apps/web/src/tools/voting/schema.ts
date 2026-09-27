import { z } from 'zod'

/**
 * 输入契约（#413 投票）
 * - text：投票选项，每行一个（空行自动忽略；至少 2 个选项才能开始投票）
 *
 * 投票本身无后端：票数只保存在组件本地 state，刷新页面即丢失。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type VotingInput = z.infer<typeof inputSchema>
export type VotingOptions = z.infer<typeof optionsSchema>
