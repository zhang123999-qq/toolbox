import { z } from 'zod'

/** 输入契约：输入框只作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：单个 phony 目标的名字 / 依赖 / 配方命令 */
export const optionsSchema = z.object({
  targetName: z.string().min(1, '目标名不能为空').max(64, '目标名过长'),
  deps: z.string().max(200, '依赖过长'),
  command: z.string().min(1, '命令不能为空').max(500, '命令过长'),
})

export type MakefileInput = z.infer<typeof inputSchema>
export type MakefileOptions = z.infer<typeof optionsSchema>
