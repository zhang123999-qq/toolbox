import { z } from 'zod'

/** 输入契约：会议时间 + 源时区 + 参与方时区列表 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  sourceZone: z.string(),
  zones: z.string(),
})

/** 选项契约：本工具无额外选项 */
export const optionsSchema = z.object({})

export type MeetingTimeInput = z.infer<typeof inputSchema>
export type MeetingTimeOptions = z.infer<typeof optionsSchema>
