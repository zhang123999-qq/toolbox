import { z } from 'zod'

/** 输入契约：番茄钟不使用输入框，仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：工作 / 休息时长（分钟，文本框承载） */
export const optionsSchema = z.object({
  workMinutes: z.string(),
  breakMinutes: z.string(),
})

export type PomodoroInput = z.infer<typeof inputSchema>
export type PomodoroOptions = z.infer<typeof optionsSchema>
